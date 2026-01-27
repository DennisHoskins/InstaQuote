import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

// Get paginated metals price history
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const startDate = req.query.start_date as string | undefined;
    const endDate = req.query.end_date as string | undefined;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT id, gold_price, ss_price, synced_at
      FROM metal_prices
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      queryText += ` AND synced_at >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND synced_at <= $${paramCount}`;
      queryParams.push(endDate);
    }

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY synced_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows.map((row: any) => ({
        id: row.id,
        gold_price: parseFloat(row.gold_price),
        ss_price: parseFloat(row.ss_price),
        synced_at: row.synced_at
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching metals history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;