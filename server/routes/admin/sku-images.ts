import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

// Get paginated SKU image mappings
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sku').optional().isString(),
  query('match_type').optional().isIn(['exact', 'contains', 'manual']),
  query('is_primary').optional().isBoolean().toBoolean(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const sku = req.query.sku as string | undefined;
    const matchType = req.query.match_type as string | undefined;
    const isPrimary = req.query.is_primary as boolean | undefined;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        si.*,
        df.file_name_no_ext,
        df.file_name,
        df.folder_path,
        df.file_extension
      FROM sku_images si
      JOIN dropbox_files df ON si.image_id = df.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (sku) {
      paramCount++;
      queryText += ` AND si.sku = $${paramCount}`;
      queryParams.push(sku);
    }

    if (matchType) {
      paramCount++;
      queryText += ` AND si.match_type = $${paramCount}`;
      queryParams.push(matchType);
    }

    if (isPrimary !== undefined) {
      paramCount++;
      queryText += ` AND si.is_primary = $${paramCount}`;
      queryParams.push(isPrimary);
    }

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY si.sku, si.is_primary DESC, si.confidence DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching SKU images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single SKU image mapping by ID
router.get('/:id', [
  param('id').isInt().toInt(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        si.*,
        df.file_name_no_ext,
        df.file_name,
        df.folder_path,
        df.file_extension
      FROM sku_images si
      JOIN dropbox_files df ON si.image_id = df.id
      WHERE si.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching SKU image mapping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get SKU image statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_mappings,
        COUNT(DISTINCT sku) as skus_with_images
      FROM sku_images
    `;

    const skusWithoutQuery = `
      SELECT COUNT(DISTINCT sku) as skus_without_images
      FROM inventory_items
      WHERE sku IS NOT NULL 
        AND sku != ''
        AND sku NOT IN (SELECT DISTINCT sku FROM sku_images)
    `;

    const multipleImagesQuery = `
      SELECT COUNT(*) as skus_with_multiple_images
      FROM (
        SELECT sku
        FROM sku_images
        GROUP BY sku
        HAVING COUNT(*) > 1
      ) as multi
    `;

    const [statsResult, withoutResult, multipleResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(skusWithoutQuery),
      pool.query(multipleImagesQuery)
    ]);

    res.json({
      totalMappings: parseInt(statsResult.rows[0].total_mappings),
      skusWithImages: parseInt(statsResult.rows[0].skus_with_images),
      skusWithoutImages: parseInt(withoutResult.rows[0].skus_without_images),
      skusWithMultipleImages: parseInt(multipleResult.rows[0].skus_with_multiple_images)
    });
  } catch (error) {
    console.error('Error fetching SKU image stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;