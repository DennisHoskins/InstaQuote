import { Router, Request, Response } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

// Get paginated orders list
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString(),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'cancelled']),
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
    const search = req.query.search as string || '';
    const status = req.query.status as string || '';
    const startDate = req.query.start_date as string || '';
    const endDate = req.query.end_date as string || '';
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        o.*,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.deleted_at IS NULL
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND (o.order_number ILIKE $${paramCount} OR o.user_name ILIKE $${paramCount} OR o.user_email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      queryText += ` AND o.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (startDate) {
      paramCount++;
      queryText += ` AND o.created_at >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      queryText += ` AND o.created_at <= $${paramCount}`;
      queryParams.push(endDate);
    }

    queryText += ` GROUP BY o.id`;

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows.map((row: any) => ({
        ...row,
        item_count: parseInt(row.item_count),
        total_amount: parseFloat(row.total_amount),
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single order with items (including images)
router.get('/:id', [
  param('id').isInt().toInt(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items with image URLs
    const itemsResult = await pool.query(
      `SELECT 
        oi.*,
        ii.sku,
        CASE 
          WHEN df.shared_link IS NOT NULL THEN 
            REPLACE(REPLACE(df.shared_link, '?dl=0', '?raw=1'), '?dl=1', '?raw=1')
          ELSE NULL
        END as image_url
      FROM order_items oi
      LEFT JOIN inventory_items ii ON ii.item_code = oi.item_code
      LEFT JOIN sku_images si ON si.sku = ii.sku AND si.is_primary = true
      LEFT JOIN dropbox_files df ON df.id = si.image_id
      WHERE oi.order_id = $1 
      ORDER BY oi.id`,
      [id]
    );

    const order = orderResult.rows[0];
    res.json({
      ...order,
      total_amount: parseFloat(order.total_amount),
      items: itemsResult.rows.map((item: any) => ({
        ...item,
        quantity: parseInt(item.quantity),
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.line_total),
      })),
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order (status and notes)
router.patch('/:id', [
  param('id').isInt().toInt(),
  body('status').optional().isIn(['pending', 'processing', 'completed', 'cancelled']),
  body('notes').optional().isString(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if order exists
    const checkResult = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
    }

    if (notes !== undefined) {
      paramCount++;
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Add updated_at
    paramCount++;
    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date());

    // Add id as last parameter
    paramCount++;
    values.push(id);

    const result = await pool.query(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    const updated = result.rows[0];
    res.json({
      ...updated,
      total_amount: parseFloat(updated.total_amount),
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Soft delete order
router.delete('/:id', [
  param('id').isInt().toInt(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE orders 
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ deleted: true, id: parseInt(result.rows[0].id) });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;