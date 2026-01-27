import Dropbox from 'dropbox';
import pg from 'pg';

// Parse CLI arguments
const args = process.argv.slice(2);
const userIndex = args.indexOf('--user');
const tokenIndex = args.indexOf('--token');

if (userIndex === -1 || tokenIndex === -1) {
  console.error('Usage: node create-links.js --user <username> --token <dropbox_token>');
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

const WEB_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];
const BATCH_SIZE = 25;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFilesWithoutLinks(client, limit) {
  const result = await client.query(
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

async function createSharedLink(dbx, filePath) {
  try {
    const link = await dbx.sharingCreateSharedLinkWithSettings({ path: filePath });
    return link.result.url;
  } catch (error) {
    if (error.error?.error?.['.tag'] === 'shared_link_already_exists') {
      const existingLink = error.error.error.shared_link_already_exists?.metadata;
      if (existingLink?.url) {
        return existingLink.url;
      }
    }
    throw error;
  }
}

async function updateSharedLink(client, dropboxId, sharedLink) {
  await client.query(
    `UPDATE dropbox_files
     SET shared_link = $1
     WHERE dropbox_id = $2`,
    [sharedLink, dropboxId]
  );
}

async function logSyncStart(client, userName) {
  const result = await client.query(
    `INSERT INTO sync_log (started_at, user_name, status, sync_type)
     VALUES ($1, $2, 'running', 'dropbox_links')
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
  console.log(`LINK CREATION STARTED: ${overallStart.toLocaleString()}`);
  console.log('='.repeat(60) + '\n');

  const client = new pg.Client(pgConfig);
  await client.connect();

  let syncId;
  let totalLinksCreated = 0;

  try {
    syncId = await logSyncStart(client, userName);

    const dbx = new Dropbox.Dropbox({ accessToken: dropboxToken });

    while (true) {
      const rows = await getFilesWithoutLinks(client, BATCH_SIZE);

      if (rows.length === 0) {
        console.log('No more files without links');
        break;
      }

      for (const row of rows) {
        const { dropbox_id, file_path, file_extension } = row;

        try {
          console.log(`[${new Date().toLocaleTimeString()}] Creating link for ${file_path}`);

          const sharedLink = await createSharedLink(dbx, file_path);
          await updateSharedLink(client, dropbox_id, sharedLink);

          totalLinksCreated++;
          await sleep(1000); // 1 second delay between requests
        } catch (error) {
          console.error(`Error for ${file_path}: ${error.message}`);
          await sleep(5000); // 5 second delay on error
        }
      }
    }

    await logSyncComplete(client, syncId, overallStart, totalLinksCreated);

    const overallEnd = new Date();
    const overallDuration = (overallEnd - overallStart) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log(`LINK CREATION COMPLETED: ${overallEnd.toLocaleString()}`);
    console.log(`TOTAL DURATION: ${overallDuration.toFixed(2)}s`);
    console.log(`TOTAL LINKS CREATED: ${totalLinksCreated}`);
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