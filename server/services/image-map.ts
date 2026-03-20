import pool from '../db/connection.js';

async function cleanupOrphanedMappings(): Promise<number> {
  console.log(`[${new Date().toLocaleTimeString()}] Cleaning up orphaned SKU mappings...`);
  
  const result = await pool.query(
    `DELETE FROM sku_images
     WHERE sku NOT IN (SELECT DISTINCT sku FROM item_sku_map)
        OR image_id NOT IN (SELECT id FROM dropbox_files)
     RETURNING id`
  );
  
  const deleted = result.rowCount || 0;
  console.log(`[${new Date().toLocaleTimeString()}] Deleted ${deleted} orphaned mappings`);
  return deleted;
}

export async function generateMappings(): Promise<{ mappingsCreated: number; orphansDeleted: number }> {
  console.log(`[${new Date().toLocaleTimeString()}] Generating SKU-Image mappings...`);

  const orphansDeleted = await cleanupOrphanedMappings();

  // Get all unmatched SKUs from item_sku_map
  const skuResult = await pool.query(`
    SELECT DISTINCT sku FROM item_sku_map
    WHERE sku NOT IN (SELECT DISTINCT sku FROM sku_images)
  `);

  const skus: string[] = skuResult.rows.map((r: any) => r.sku);
  console.log(`[${new Date().toLocaleTimeString()}] Processing ${skus.length} unmatched SKUs...`);

  const BATCH_SIZE = 100;
  let mappingsCreated = 0;

  for (let i = 0; i < skus.length; i += BATCH_SIZE) {
    const batch = skus.slice(i, i + BATCH_SIZE);

    const result = await pool.query(`
      INSERT INTO sku_images (sku, image_id, match_type, is_primary, confidence)
      SELECT DISTINCT
        m.sku,
        df.id,
        CASE
          WHEN UPPER(df.file_name_no_ext) = UPPER(m.sku) THEN 'exact'
          ELSE 'contains'
        END as match_type,
        FALSE as is_primary,
        CASE
          WHEN df.file_extension NOT IN ('.jpg', '.jpeg', '.png', '.gif') THEN 0.3
          WHEN UPPER(df.file_name_no_ext) = UPPER(m.sku) THEN 1.0
          WHEN UPPER(df.file_name_no_ext) LIKE '%6MM%' OR UPPER(df.file_name_no_ext) LIKE '%6 MM%' THEN 0.9
          WHEN df.file_name_no_ext ~ ('^' || m.sku || '6') THEN 0.8
          ELSE 0.5
        END as confidence
      FROM item_sku_map m
      JOIN dropbox_files df ON 
        UPPER(df.file_name_no_ext) ~ ('(^|[^A-Z0-9])' || UPPER(m.sku) || '([^A-Z]|$)')
      WHERE m.sku = ANY($1)
      ON CONFLICT (sku, image_id) DO NOTHING
    `, [batch]);

    mappingsCreated += result.rowCount || 0;

    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`[${new Date().toLocaleTimeString()}] Processed ${Math.min(i + BATCH_SIZE, skus.length)}/${skus.length} SKUs, ${mappingsCreated} mappings so far...`);
    }
  }

  console.log(`[${new Date().toLocaleTimeString()}] Setting primary images...`);
  await pool.query(`
    UPDATE sku_images si
    SET is_primary = TRUE
    WHERE si.id IN (
      SELECT DISTINCT ON (si2.sku) si2.id
      FROM sku_images si2
      JOIN dropbox_files df ON df.id = si2.image_id
      WHERE df.file_extension IN ('.jpg', '.jpeg', '.png', '.gif')
      ORDER BY si2.sku,
        CASE WHEN UPPER(df.file_name_no_ext) LIKE '%6MM%' OR UPPER(df.file_name_no_ext) LIKE '%6 MM%' THEN 0 ELSE 1 END,
        CASE WHEN df.file_name_no_ext ~ ('^' || si2.sku || '6') THEN 0 ELSE 1 END,
        si2.confidence DESC,
        si2.id
    )
  `);

  console.log(`[${new Date().toLocaleTimeString()}] Mappings generated`);
  return { mappingsCreated, orphansDeleted };
}

export async function deleteAllMappings(): Promise<{ mappingsDeleted: number }> {
  console.log(`[${new Date().toLocaleTimeString()}] Deleting all SKU mappings...`);
  
  const result = await pool.query('DELETE FROM sku_images RETURNING id');
  const mappingsDeleted = result.rowCount || 0;
  
  console.log(`[${new Date().toLocaleTimeString()}] Deleted ${mappingsDeleted} mappings`);
  return { mappingsDeleted };
}