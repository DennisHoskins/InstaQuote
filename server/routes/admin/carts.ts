import { Router, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import pool from '../../db/connection.js';
import { AuthRequest } from '../../middleware/auth.js';

const router = Router();

// GET /api/admin/carts — paginated list grouped by user
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT
        user_id,
        user_name,
        user_email,
        COUNT(item_code) as item_count,
        SUM(quantity) as total_qty,
        SUM(quantity * unit_price) as total_value,
        MIN(added_at) as first_added,
        MAX(added_at) as last_updated
      FROM user_cart
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` WHERE user_email ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }

    queryText += ` GROUP BY user_id, user_email, user_name`;

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY last_updated DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows.map((row: any) => ({
        user_id: row.user_id,
        user_name: row.user_name,
        user_email: row.user_email,
        item_count: parseInt(row.item_count),
        total_qty: parseInt(row.total_qty),
        total_value: parseFloat(row.total_value),
        first_added: row.first_added,
        last_updated: row.last_updated,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching carts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/carts/:user_id — single user's cart items
router.get('/:user_id', [
  param('user_id').isInt().toInt(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT
        uc.user_id,
        uc.user_name,
        uc.user_email,
        uc.item_code,
        uc.quantity,
        uc.unit_price,
        uc.added_at,
        ii.description,
        ii.category,
        m.sku,
        CASE
          WHEN df.shared_link IS NOT NULL THEN
            REPLACE(REPLACE(REPLACE(REPLACE(df.shared_link, '?dl=0', '?raw=1'), '?dl=1', '?raw=1'), '&dl=0', '&raw=1'), '&dl=1', '&raw=1')
          ELSE NULL
        END as image_url
      FROM user_cart uc
      LEFT JOIN inventory_items ii ON ii.item_code = uc.item_code
      LEFT JOIN item_sku_map m ON m.item_code = uc.item_code
      LEFT JOIN sku_images si ON si.sku = m.sku AND si.is_primary = true
      LEFT JOIN dropbox_files df ON df.id = si.image_id
      WHERE uc.user_id = $1
      ORDER BY uc.added_at ASC`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const { user_id: uid, user_name, user_email } = result.rows[0];

    res.json({
      user_id: uid,
      user_name,
      user_email,
      items: result.rows.map((row: any) => ({
        item_code: row.item_code,
        quantity: row.quantity,
        unit_price: parseFloat(row.unit_price),
        line_total: parseFloat(row.unit_price) * row.quantity,
        added_at: row.added_at,
        description: row.description,
        category: row.category,
        sku: row.sku,
        image_url: row.image_url,
      })),
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;