import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

// Get unique file types
router.get('/file-types', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT file_extension 
       FROM dropbox_files 
       WHERE file_extension IS NOT NULL AND file_extension != ''
       ORDER BY file_extension`
    );
    
    res.json(result.rows.map((row: any) => row.file_extension));
  } catch (error) {
    console.error('Error fetching file types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single image details with SKU mappings
router.get('/:id', [
  param('id').isInt().toInt(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    // Get image details
    const imageResult = await pool.query(
      `SELECT * FROM dropbox_files WHERE id = $1`,
      [id]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get SKU mappings for this image
    const mappingsResult = await pool.query(
      `SELECT 
        si.id as mapping_id,
        si.sku,
        si.is_primary,
        si.match_type,
        si.confidence,
        COUNT(ii.item_code) as item_count
       FROM sku_images si
       LEFT JOIN inventory_items ii ON ii.sku = si.sku
       WHERE si.image_id = $1
       GROUP BY si.id, si.sku, si.is_primary, si.match_type, si.confidence
       ORDER BY si.is_primary DESC, si.confidence DESC`,
      [id]
    );

    res.json({
      image: imageResult.rows[0],
      mappings: mappingsResult.rows
    });
  } catch (error) {
    console.error('Error fetching image details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get paginated images list
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString(),
  query('matched').optional().isString().isIn(['true', 'false']),
  query('file_type').optional().isString(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string || '';
    const matched = req.query.matched === 'true' ? true : req.query.matched === 'false' ? false : undefined;
    const fileType = req.query.file_type as string | undefined;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        df.*,
        EXISTS (
          SELECT 1 FROM inventory_items 
          WHERE item_code = df.file_name_no_ext
        ) as is_matched,
        (
          SELECT item_code FROM inventory_items 
          WHERE item_code = df.file_name_no_ext
          LIMIT 1
        ) as matched_item_code
      FROM dropbox_files df
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (file_name ILIKE $${paramCount} OR file_name_no_ext ILIKE $${paramCount} OR folder_path ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (matched !== undefined) {
      const matchCondition = matched 
        ? `EXISTS (SELECT 1 FROM inventory_items WHERE item_code = df.file_name_no_ext)`
        : `NOT EXISTS (SELECT 1 FROM inventory_items WHERE item_code = df.file_name_no_ext)`;
      queryText += ` AND ${matchCondition}`;
    }

    if (fileType) {
      paramCount++;
      queryText += ` AND df.file_extension = $${paramCount}`;
      queryParams.push(fileType);
    }

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY file_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;