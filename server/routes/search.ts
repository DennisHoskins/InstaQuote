import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../db/connection.js';

const router = Router();

router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').trim().notEmpty().escape(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    if (!search) {
      return res.status(400).json({ error: 'Search parameter is required' });
    }

    // Build WHERE clause for search across all items
    const whereClause = `WHERE inactive = false AND (LOWER(item_code) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(destination) LIKE $1 OR LOWER(category) LIKE $1)`;
    const params: any[] = [`%${search.toLowerCase()}%`];

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT item_code) FROM inventory_items ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated items
    const itemsResult = await pool.query(
      `SELECT DISTINCT ON (item_code) item_code, description, category, destination, total_ws_price, inactive, is_catalog
       FROM inventory_items 
       ${whereClause}
       ORDER BY item_code
       LIMIT $2 OFFSET $3`,
      [...params, limit, offset]
    );

    res.json({
      items: itemsResult.rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;