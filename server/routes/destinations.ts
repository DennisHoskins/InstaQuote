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
    let whereClause = 'WHERE i.is_catalog = false AND i.destination = $1 AND i.inactive = false';
    const params: any[] = [destination];
    
    if (search) {
      whereClause += ` AND (LOWER(i.item_code) LIKE $2 OR LOWER(i.description) LIKE $2 OR LOWER(i.category) LIKE $2)`;
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
      `SELECT DISTINCT ON (i.item_code) i.item_code, m.sku, i.description, i.category, i.destination, i.total_ws_price, i.inactive
       FROM inventory_items i
       LEFT JOIN item_sku_map m ON m.item_code = i.item_code
       ${whereClause}
       ORDER BY i.item_code
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