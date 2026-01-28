import pool from '../db/connection.js';

async function cleanupOrphanedMappings(): Promise<number> {
  console.log(`[${new Date().toLocaleTimeString()}] Cleaning up orphaned SKU mappings...`);
  
  const result = await pool.query(
    `DELETE FROM sku_images
     WHERE sku NOT IN (SELECT DISTINCT sku FROM inventory_items WHERE sku IS NOT NULL)
        OR image_id NOT IN (SELECT id FROM dropbox_files)
     RETURNING id`
  );
  
  const deleted = result.rowCount || 0;
  console.log(`[${new Date().toLocaleTimeString()}] Deleted ${deleted} orphaned mappings`);
  return deleted;
}

export async function generateMappings(): Promise<{ mappingsCreated: number; orphansDeleted: number }> {
  console.log(`[${new Date().toLocaleTimeString()}] Generating SKU-Image mappings...`);

  // Clean up orphaned mappings first
  const orphansDeleted = await cleanupOrphanedMappings();

  // Only generate mappings for SKUs that don't have any mappings yet
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
        WHEN df.file_extension IN ('.jpg', '.jpeg', '.png', '.gif')
          AND (UPPER(df.file_name_no_ext) LIKE '%6MM%' 
            OR UPPER(df.file_name_no_ext) LIKE '%6 MM%')
        THEN TRUE
        ELSE FALSE
      END as is_primary,
      CASE
        WHEN df.file_extension NOT IN ('.jpg', '.jpeg', '.png', '.gif') THEN 0.3
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
      AND i.sku NOT IN (SELECT DISTINCT sku FROM sku_images)
  `;

  console.log(`[${new Date().toLocaleTimeString()}] Creating new mappings...`);
  const result = await pool.query(generateQuery);
  const mappingsCreated = result.rowCount || 0;

  console.log(`[${new Date().toLocaleTimeString()}] Setting primary images for new mappings...`);
  await pool.query(`
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