import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string | undefined;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        m.item_code,
        m.sku,
        i.description,
        i.category,
        i.destination,
        i.inactive
      FROM item_sku_map m
      JOIN inventory_items i ON i.item_code = m.item_code
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (m.item_code ILIKE $${paramCount} OR m.sku ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY m.item_code LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows,
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching SKU item mappings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;