import pg from 'pg';

// Parse CLI arguments
const args = process.argv.slice(2);
const userIndex = args.indexOf('--user');

if (userIndex === -1) {
  console.error('Usage: node generate-mappings.js --user <username>');
  process.exit(1);
}

const userName = args[userIndex + 1];

if (!userName) {
  console.error('--user is required');
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

async function generateMappings(client) {
  const startTime = new Date();
  console.log(`[${startTime.toLocaleTimeString()}] Generating SKU-Image mappings...`);

  // Clear existing mappings
  console.log(`[${new Date().toLocaleTimeString()}] Clearing existing mappings...`);
  await client.query('DELETE FROM sku_images');

  // Generate mappings with word boundary regex
  const generateQuery = `
    INSERT INTO sku_images (sku, image_id, match_type, is_primary, confidence)
    SELECT DISTINCT
      i.sku,
      df.id,
      CASE
        WHEN UPPER(df.file_name_no_ext) = UPPER(i.sku) THEN 'exact'
        ELSE 'contains'
      END as match_type,
      CASE
        WHEN UPPER(df.file_name_no_ext) LIKE '%6MM%' 
          OR UPPER(df.file_name_no_ext) LIKE '%6 MM%'
        THEN TRUE
        ELSE FALSE
      END as is_primary,
      CASE
        WHEN UPPER(df.file_name_no_ext) = UPPER(i.sku) THEN 1.0
        WHEN UPPER(df.file_name_no_ext) LIKE '%6MM%' OR UPPER(df.file_name_no_ext) LIKE '%6 MM%' THEN 0.8
        ELSE 0.5
      END as confidence
    FROM inventory_items i
    JOIN dropbox_files df ON 
      UPPER(df.file_name_no_ext) ~ ('(^|[^A-Z0-9])' || UPPER(i.sku) || '([^A-Z0-9]|$)')
    WHERE i.sku IS NOT NULL 
      AND i.sku != '' 
      AND LENGTH(i.sku) >= 3
  `;

  console.log(`[${new Date().toLocaleTimeString()}] Creating mappings...`);
  const result = await client.query(generateQuery);
  const mappingsCreated = result.rowCount;

  // For SKUs with multiple images but no 6mm variant, set first one as primary
  console.log(`[${new Date().toLocaleTimeString()}] Setting primary images...`);
  await client.query(`
    UPDATE sku_images si1
    SET is_primary = TRUE
    WHERE id IN (
      SELECT DISTINCT ON (sku) id
      FROM sku_images
      WHERE sku IN (
        SELECT sku
        FROM sku_images
        GROUP BY sku
        HAVING COUNT(*) > 1 AND SUM(CASE WHEN is_primary THEN 1 ELSE 0 END) = 0
      )
      ORDER BY sku, confidence DESC, id
    )
  `);

  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  console.log(`[${endTime.toLocaleTimeString()}] Mappings generated (${duration.toFixed(2)}s)`);

  return mappingsCreated;
}

async function logSyncStart(client, userName) {
  const result = await client.query(
    `INSERT INTO sync_log (started_at, user_name, status, sync_type)
     VALUES ($1, $2, 'running', 'sku_mapping')
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
  console.log(`SKU MAPPING GENERATION STARTED: ${overallStart.toLocaleString()}`);
  console.log('='.repeat(60) + '\n');

  const client = new pg.Client(pgConfig);
  await client.connect();

  let syncId;
  try {
    syncId = await logSyncStart(client, userName);

    const mappingsCreated = await generateMappings(client);

    await logSyncComplete(client, syncId, overallStart, mappingsCreated);

    const overallEnd = new Date();
    const overallDuration = (overallEnd - overallStart) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log(`SKU MAPPING GENERATION COMPLETED: ${overallEnd.toLocaleString()}`);
    console.log(`TOTAL DURATION: ${overallDuration.toFixed(2)}s`);
    console.log(`MAPPINGS CREATED: ${mappingsCreated}`);
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