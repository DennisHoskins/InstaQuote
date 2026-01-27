import Dropbox from 'dropbox';
import pool from '../db/connection.js';
import path from 'path';

const START_PATHS = ['/DJB/DEST', '/DJB/CBC/All Catalog Items'];
const EXCLUDED_FOLDERS = [
  'BEACH TAGS',
  'OLD STYLES',
  'Old styles',
  'Stock',
  'Marketing',
  'Generic Ad',
  'Prototypes',
  'Photography',
  'Artwork',
  'web',
];
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.psd', '.ai', '.tif', '.tiff']);
const WEB_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];

function isExcluded(pathDisplay: string | undefined): boolean {
  if (!pathDisplay) return false;
  const pathUpper = pathDisplay.toUpperCase();
  return EXCLUDED_FOLDERS.some(excluded => {
    const excludedUpper = excluded.toUpperCase();
    return pathUpper.includes(`/${excludedUpper}`) || pathUpper.endsWith(`/${excludedUpper}`);
  });
}

interface DropboxFile {
  file_path: string;
  file_name: string;
  file_name_no_ext: string;
  file_extension: string;
  folder_path: string;
  file_size: number;
  modified_date: string;
  dropbox_id: string;
}

async function crawlDropboxFiles(dbx: Dropbox.Dropbox): Promise<DropboxFile[]> {
  console.log(`[${new Date().toLocaleTimeString()}] Starting Dropbox crawl...`);

  const files: DropboxFile[] = [];

  for (const startPath of START_PATHS) {
    console.log(`[${new Date().toLocaleTimeString()}] Crawling ${startPath}...`);

    let hasMore = true;
    let cursor: string | undefined = undefined;

    while (hasMore) {
      let result;
      if (cursor) {
        result = await dbx.filesListFolderContinue({ cursor });
      } else {
        result = await dbx.filesListFolder({ path: startPath, recursive: true });
      }

      for (const entry of result.result.entries) {
        if (entry['.tag'] !== 'file') continue;

        // Add type guard and null checks
        if (!entry.path_display || !entry.name || !entry.id) continue;

        if (isExcluded(entry.path_display)) continue;
        if (entry.path_display.includes('/.metadata')) continue;
        if (entry.name.startsWith('.')) continue;

        const fileName = entry.name;
        const fileNameNoExt = path.parse(fileName).name;
        const fileExtension = path.extname(fileName).toLowerCase();

        if (!ALLOWED_EXTENSIONS.has(fileExtension)) continue;

        const folderPath = path.dirname(entry.path_display);

        files.push({
          file_path: entry.path_display,
          file_name: fileName,
          file_name_no_ext: fileNameNoExt,
          file_extension: fileExtension,
          folder_path: folderPath,
          file_size: entry.size,
          modified_date: entry.server_modified,
          dropbox_id: entry.id,
        });
      }

      hasMore = result.result.has_more;
      cursor = result.result.cursor;
    }
  }

  console.log(`[${new Date().toLocaleTimeString()}] Found ${files.length} files`);
  return files;
}

async function syncFilesToDatabase(dropboxFiles: DropboxFile[]): Promise<number> {
  console.log(`[${new Date().toLocaleTimeString()}] Syncing files to database...`);

  const existingResult = await pool.query('SELECT dropbox_id, shared_link FROM dropbox_files');
  const existingFiles = new Map(
    existingResult.rows.map(row => [row.dropbox_id, row.shared_link])
  );

  const dropboxFileIds = new Set(dropboxFiles.map(f => f.dropbox_id));

  const toInsert = dropboxFiles.filter(f => !existingFiles.has(f.dropbox_id));
  const toUpdate = dropboxFiles.filter(f => existingFiles.has(f.dropbox_id));
  const toDelete = [...existingFiles.keys()].filter(id => !dropboxFileIds.has(id));

  console.log(`[${new Date().toLocaleTimeString()}] Changes: Insert ${toInsert.length}, Update ${toUpdate.length}, Delete ${toDelete.length}`);

  for (const file of toInsert) {
    await pool.query(
      `INSERT INTO dropbox_files 
       (file_path, file_name, file_name_no_ext, file_extension, folder_path, 
        file_size, modified_date, dropbox_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        file.file_path,
        file.file_name,
        file.file_name_no_ext,
        file.file_extension,
        file.folder_path,
        file.file_size,
        file.modified_date,
        file.dropbox_id,
      ]
    );
  }

  for (const file of toUpdate) {
    await pool.query(
      `UPDATE dropbox_files
       SET file_path = $1,
           file_name = $2,
           file_name_no_ext = $3,
           file_extension = $4,
           folder_path = $5,
           file_size = $6,
           modified_date = $7
       WHERE dropbox_id = $8`,
      [
        file.file_path,
        file.file_name,
        file.file_name_no_ext,
        file.file_extension,
        file.folder_path,
        file.file_size,
        file.modified_date,
        file.dropbox_id,
      ]
    );
  }

  if (toDelete.length > 0) {
    await pool.query(
      `DELETE FROM dropbox_files WHERE dropbox_id = ANY($1)`,
      [toDelete]
    );
  }

  console.log(`[${new Date().toLocaleTimeString()}] Sync completed`);
  return toInsert.length + toUpdate.length + toDelete.length;
}

export async function crawlDropbox(dropboxToken: string): Promise<{ itemsChanged: number }> {
  const dbx = new Dropbox.Dropbox({ accessToken: dropboxToken });
  const files = await crawlDropboxFiles(dbx);
  const totalChanges = await syncFilesToDatabase(files);
  return { itemsChanged: totalChanges };
}

async function getFilesWithoutLinks(limit: number): Promise<Array<{ dropbox_id: string; file_path: string }>> {
  const result = await pool.query(
    `SELECT dropbox_id, file_path, file_extension
     FROM dropbox_files
     WHERE shared_link IS NULL
       AND file_extension = ANY($1)
     ORDER BY dropbox_id
     LIMIT $2`,
    [WEB_IMAGE_EXTENSIONS, limit]
  );
  return result.rows;
}

async function createSharedLink(dbx: Dropbox.Dropbox, filePath: string): Promise<string> {
  try {
    const link = await dbx.sharingCreateSharedLinkWithSettings({ path: filePath });
    return link.result.url;
  } catch (error: any) {
    if (error.error?.error?.['.tag'] === 'shared_link_already_exists') {
      const existingLink = error.error.error.shared_link_already_exists?.metadata;
      if (existingLink?.url) {
        return existingLink.url;
      }
    }
    throw error;
  }
}

async function updateSharedLink(dropboxId: string, sharedLink: string): Promise<void> {
  await pool.query(
    `UPDATE dropbox_files
     SET shared_link = $1
     WHERE dropbox_id = $2`,
    [sharedLink, dropboxId]
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupOrphanedLinks(): Promise<number> {
  console.log(`[${new Date().toLocaleTimeString()}] Cleaning up orphaned shared links...`);
  
  const result = await pool.query(
    `DELETE FROM dropbox_files
     WHERE id NOT IN (SELECT id FROM dropbox_files WHERE dropbox_id IS NOT NULL)
     RETURNING id`
  );
  
  const deleted = result.rowCount || 0;
  console.log(`[${new Date().toLocaleTimeString()}] Deleted ${deleted} orphaned links`);
  return deleted;
}

export async function createLinks(dropboxToken: string, batchSize: number = 25): Promise<{ linksCreated: number; orphansDeleted: number }> {
  // Clean up orphaned links first
  const orphansDeleted = await cleanupOrphanedLinks();

  const dbx = new Dropbox.Dropbox({ accessToken: dropboxToken });
  let totalLinksCreated = 0;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;

  while (true) {
    const rows = await getFilesWithoutLinks(batchSize);

    if (rows.length === 0) {
      console.log('No more files without links');
      break;
    }

    let batchSuccessCount = 0;

    for (const row of rows) {
      const { dropbox_id, file_path } = row;

      try {
        console.log(`[${new Date().toLocaleTimeString()}] Creating link for ${file_path}`);

        const sharedLink = await createSharedLink(dbx, file_path);
        await updateSharedLink(dropbox_id, sharedLink);

        totalLinksCreated++;
        batchSuccessCount++;
        consecutiveFailures = 0;
        await sleep(1000);
      } catch (error: any) {
        console.error(`Error for ${file_path}: ${error.message}`);
        
        // Check for 401 - token is invalid
        if (error.status === 401) {
          throw new Error('Dropbox token expired or invalid');
        }
        
        consecutiveFailures++;
        
        // If we've failed too many times in a row, stop
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          throw new Error(`Failed ${MAX_CONSECUTIVE_FAILURES} consecutive times, stopping sync`);
        }
        
        await sleep(5000);
      }
    }

    // If entire batch failed, something is wrong
    if (batchSuccessCount === 0) {
      throw new Error('Entire batch failed, stopping sync');
    }
  }

  return { linksCreated: totalLinksCreated, orphansDeleted };
}

export async function getMissingLinksCount(): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as missing_links
     FROM dropbox_files
     WHERE shared_link IS NULL
       AND file_extension = ANY($1)`,
    [WEB_IMAGE_EXTENSIONS]
  );
  return parseInt(result.rows[0].missing_links);
}