import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import pool from '../db/connection.js';

const router = Router();

// Get list of unique destinations
router.get('/', [
  query('search').optional().trim().escape(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const search = req.query.search as string || '';
    
    let query = `SELECT DISTINCT destination 
                 FROM inventory_items 
                 WHERE is_catalog = false AND destination IS NOT NULL AND inactive = false`;
    const params: any[] = [];
    
    if (search) {
      query += ` AND LOWER(destination) LIKE $1`;
      params.push(`%${search.toLowerCase()}%`);
    }
    
    query += ` ORDER BY destination`;

    const result = await pool.query(query, params);
    const destinations = result.rows.map(row => row.destination);
    res.json(destinations);
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get paginated items for a specific destination
router.get('/:destination/items', [
  param('destination').trim().escape(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().escape(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { destination } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE is_catalog = false AND destination = $1 AND inactive = false';
    const params: any[] = [destination];
    
    if (search) {
      whereClause += ` AND (LOWER(item_code) LIKE $2 OR LOWER(description) LIKE $2 OR LOWER(category) LIKE $2)`;
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
      `SELECT DISTINCT ON (item_code) item_code, sku, description, category, destination, total_ws_price, inactive
       FROM inventory_items 
       ${whereClause}
       ORDER BY item_code
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
    console.error('Error fetching destination items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;