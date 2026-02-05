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
    let whereClause = 'WHERE is_catalog = true AND inactive = false';
    const params: any[] = [];
    
    if (search) {
      whereClause += ` AND (LOWER(item_code) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(category) LIKE $1)`;
      params.push(`%${search.toLowerCase()}%`);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT item_code) FROM inventory_items ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated items
    const itemsResult = await pool.query(
      `SELECT * FROM (
        SELECT DISTINCT ON (item_code) item_code, cat_page, cat_page_order, sku, description, category, destination, total_ws_price, inactive
        FROM inventory_items 
        ${whereClause}
        ORDER BY item_code
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