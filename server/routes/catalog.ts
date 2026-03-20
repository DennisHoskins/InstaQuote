import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../db/connection.js';

const router = Router();

router.get('/items', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().escape(),
], async (req: Request, res: Response) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE i.is_catalog = true AND i.inactive = false';
    const params: any[] = [];
    
    if (search) {
      whereClause += ` AND (LOWER(i.item_code) LIKE $1 OR LOWER(i.description) LIKE $1 OR LOWER(i.category) LIKE $1)`;
      params.push(`%${search.toLowerCase()}%`);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT i.item_code) FROM inventory_items i ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated items
    const itemsResult = await pool.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (i.item_code) i.item_code, i.cat_page, i.cat_page_order, m.sku, i.description, i.category, i.destination, i.total_ws_price, i.inactive
        FROM inventory_items i
        LEFT JOIN item_sku_map m ON m.item_code = i.item_code
        ${whereClause}
        ORDER BY i.item_code
      ) sub
      ORDER BY cat_page, cat_page_order, item_code
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      items: itemsResult.rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching catalog items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;