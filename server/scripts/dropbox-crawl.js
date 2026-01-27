import Dropbox from 'dropbox';
import pg from 'pg';
import path from 'path';

// Parse CLI arguments
const args = process.argv.slice(2);
const userIndex = args.indexOf('--user');
const tokenIndex = args.indexOf('--token');

if (userIndex === -1 || tokenIndex === -1) {
  console.error('Usage: node crawl-dropbox.js --user <username> --token <dropbox_token>');
  process.exit(1);
}

const userName = args[userIndex + 1];
const dropboxToken = args[tokenIndex + 1];

if (!userName || !dropboxToken) {
  console.error('Both --user and --token are required');
  process.exit(1);
}

// PostgreSQL config
const pgConfig = {
  host: 'localhost',
  port: 5432,
  database: 'instaquote',
  user: 'postgres',
  password: 'admin',
};

// Dropbox config
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

function isExcluded(pathDisplay) {
  const pathUpper = pathDisplay.toUpperCase();
  return EXCLUDED_FOLDERS.some(excluded => {
    const excludedUpper = excluded.toUpperCase();
    return pathUpper.includes(`/${excludedUpper}`) || pathUpper.endsWith(`/${excludedUpper}`);
  });
}

async function crawlDropbox(dbx) {
  const startTime = new Date();
  console.log(`[${startTime.toLocaleTimeString()}] Starting Dropbox crawl from ${START_PATHS.join(', ')}...`);

  const files = [];

  for (const startPath of START_PATHS) {
    console.log(`[${new Date().toLocaleTimeString()}] Crawling ${startPath}...`);

    let hasMore = true;
    let cursor = null;

    while (hasMore) {
      let result;
      if (cursor) {
        result = await dbx.filesListFolderContinue({ cursor });
      } else {
        result = await dbx.filesListFolder({ path: startPath, recursive: true });
      }

      for (const entry of result.result.entries) {
        if (entry['.tag'] !== 'file') continue;

        // Apply filters
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

  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  console.log(`[${endTime.toLocaleTimeString()}] Found ${files.length} files (${duration.toFixed(2)}s)`);

  return files;
}

async function syncFiles(client, dropboxFiles) {
  const startTime = new Date();
  console.log(`[${startTime.toLocaleTimeString()}] Syncing files to database...`);

  // Get all existing files from DB
  const existingResult = await client.query('SELECT dropbox_id, shared_link FROM dropbox_files');
  const existingFiles = new Map(
    existingResult.rows.map(row => [row.dropbox_id, row.shared_link])
  );

  const dropboxFileIds = new Set(dropboxFiles.map(f => f.dropbox_id));

  // Determine operations
  const toInsert = dropboxFiles.filter(f => !existingFiles.has(f.dropbox_id));
  const toUpdate = dropboxFiles.filter(f => existingFiles.has(f.dropbox_id));
  const toDelete = [...existingFiles.keys()].filter(id => !dropboxFileIds.has(id));

  console.log(`[${new Date().toLocaleTimeString()}] Changes: Insert ${toInsert.length}, Update ${toUpdate.length}, Delete ${toDelete.length}`);

  // INSERT new files
  for (const file of toInsert) {
    await client.query(
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

  // UPDATE existing files (preserve shared_link)
  for (const file of toUpdate) {
    await client.query(
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

  // DELETE removed files
  if (toDelete.length > 0) {
    await client.query(
      `DELETE FROM dropbox_files WHERE dropbox_id = ANY($1)`,
      [toDelete]
    );
  }

  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  console.log(`[${endTime.toLocaleTimeString()}] Sync completed (${duration.toFixed(2)}s)`);

  return toInsert.length + toUpdate.length + toDelete.length;
}

async function logSyncStart(client, userName) {
  const result = await client.query(
    `INSERT INTO sync_log (started_at, user_name, status, sync_type)
     VALUES ($1, $2, 'running', 'dropbox_crawl')
     RETURNING id`,
    [new Date(), userName]
  );
  return result.rows[0].id;
}

async function logSyncComplete(client, syncId, startedAt, itemsSynced) {
  const completedAt = new Date();
  const duration = (completedAt - startedAt) / 1000;
  await client.query(
    `UPDATE sync_log
     SET completed_at = $1, duration_seconds = $2, items_synced = $3, status = 'success'
     WHERE id = $4`,
    [completedAt, duration, itemsSynced, syncId]
  );
}

async function logSyncError(client, syncId, startedAt, errorMessage) {
  const completedAt = new Date();
  const duration = (completedAt - startedAt) / 1000;
  await client.query(
    `UPDATE sync_log
     SET completed_at = $1, duration_seconds = $2, status = 'failed', error_message = $3
     WHERE id = $4`,
    [completedAt, duration, errorMessage, syncId]
  );
}

async function main() {
  const overallStart = new Date();
  console.log('\n' + '='.repeat(60));
  console.log(`DROPBOX CRAWL STARTED: ${overallStart.toLocaleString()}`);
  console.log('='.repeat(60) + '\n');

  const client = new pg.Client(pgConfig);
  await client.connect();

  let syncId;
  try {
    syncId = await logSyncStart(client, userName);

    const dbx = new Dropbox.Dropbox({ accessToken: dropboxToken });

    const files = await crawlDropbox(dbx);

    const totalChanges = await syncFiles(client, files);

    await logSyncComplete(client, syncId, overallStart, totalChanges);

    const overallEnd = new Date();
    const overallDuration = (overallEnd - overallStart) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log(`DROPBOX CRAWL COMPLETED: ${overallEnd.toLocaleString()}`);
    console.log(`TOTAL DURATION: ${overallDuration.toFixed(2)}s`);
    console.log(`TOTAL CHANGES: ${totalChanges}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    if (syncId) {
      await logSyncError(client, syncId, overallStart, error.message);
    }
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();