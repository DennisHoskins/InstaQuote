import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['access', 'dropbox', 'dropbox_crawl', 'dropbox_links', 'sku_mapping']),
  query('status').optional().isIn(['success', 'failed', 'running']),
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
    const type = req.query.type as string;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (type) {
      whereConditions.push(`sync_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`started_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`started_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const countQuery = `SELECT COUNT(*) FROM sync_log ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT * FROM sync_log 
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await pool.query(dataQuery, params);

    res.json({
      items: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching sync log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;