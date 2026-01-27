import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

// Get paginated items list
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString(),
  query('has_image').optional().isString().isIn(['true', 'false']),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string || '';
    const hasImage = req.query.has_image === 'true' ? true : req.query.has_image === 'false' ? false : undefined;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        ci.*,
        EXISTS (
          SELECT 1 FROM dropbox_files 
          WHERE file_name_no_ext = ci.item_code
        ) as has_image
      FROM inventory_items ci
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (item_code ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (hasImage !== undefined) {
      const imageCondition = hasImage 
        ? `EXISTS (SELECT 1 FROM dropbox_files WHERE file_name_no_ext = ci.item_code)`
        : `NOT EXISTS (SELECT 1 FROM dropbox_files WHERE file_name_no_ext = ci.item_code)`;
      queryText += ` AND ${imageCondition}`;
    }

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY item_code LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;