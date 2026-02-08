import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import pool from '../db/connection.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// Create order
router.post('/', [
  body('items').isArray({ min: 1 }),
  body('items.*.item_code').trim().notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unit_price').isFloat({ min: 0 }),
  body('notes').optional().isString(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const client = await pool.connect();

  try {
    const { items, notes } = req.body;
    const user = req.user!;

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);

    await client.query('BEGIN');

    // Generate unique order number
    let orderNumber = generateOrderNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await client.query(
        'SELECT id FROM orders WHERE order_number = $1',
        [orderNumber]
      );
      if (existing.rows.length === 0) break;
      orderNumber = generateOrderNumber();
      attempts++;
    }

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, user_name, user_email, total_amount, notes, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $2)
       RETURNING id, order_number, total_amount, status, created_at`,
      [orderNumber, user.id, user.username, `${user.username}@example.com`, totalAmount.toFixed(2), notes || null]
    );

    const order = orderResult.rows[0];

    // Insert order items
    for (const item of items) {
      // Get item details from inventory
      const itemResult = await client.query(
        'SELECT sku, description FROM inventory_items WHERE item_code = $1 LIMIT 1',
        [item.item_code]
      );

      const itemData = itemResult.rows[0];
      const lineTotal = item.unit_price * item.quantity;

      await client.query(
        `INSERT INTO order_items (order_id, item_code, sku, description, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          order.id,
          item.item_code,
          itemData?.sku || null,
          itemData?.description || null,
          item.quantity,
          item.unit_price.toFixed(2),
          lineTotal.toFixed(2)
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get order history
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('status').optional().isIn(['pending', 'processing', 'completed', 'cancelled']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.created_at,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = $1 AND o.deleted_at IS NULL
    `;
    const queryParams: any[] = [user.id];
    let paramCount = 1;

    if (search) {
      paramCount++;
      queryText += ` AND o.order_number ILIKE $${paramCount}`;
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
        id: row.id,
        order_number: row.order_number,
        total_amount: parseFloat(row.total_amount),
        status: row.status,
        created_at: row.created_at,
        item_count: parseInt(row.item_count)
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order detail (with images)
router.get('/:id', [
  param('id').isInt().toInt(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = req.user!;
    const { id } = req.params;

    // Get order
    const orderResult = await pool.query(
      `SELECT * FROM orders 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [id, user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items with image URLs
    const itemsResult = await pool.query(
      `SELECT 
        oi.*,
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

    res.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: parseFloat(order.total_amount),
        status: order.status,
        notes: order.notes,
        created_at: order.created_at,
        user_name: order.user_name,
        user_email: order.user_email
      },
      items: itemsResult.rows.map((item: any) => ({
        id: item.id,
        item_code: item.item_code,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.line_total),
        image_url: item.image_url
      }))
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder - get items with current prices
router.post('/:id/reorder', [
  param('id').isInt().toInt(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = req.user!;
    const { id } = req.params;

    // Get order items
    const itemsResult = await pool.query(
      `SELECT oi.* FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.order_id = $1 AND o.user_id = $2 AND o.deleted_at IS NULL`,
      [id, user.id]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get current prices and details for each item
    const cartItems = [];
    for (const item of itemsResult.rows) {
      const currentResult = await pool.query(
        `SELECT 
          ii.total_ws_price,
          ii.description,
          ii.sku,
          ii.category,
          CASE 
            WHEN df.shared_link IS NOT NULL THEN 
              REPLACE(REPLACE(df.shared_link, '?dl=0', '?raw=1'), '?dl=1', '?raw=1')
            ELSE NULL
          END as image_url
         FROM inventory_items ii
         LEFT JOIN sku_images si ON si.sku = ii.sku AND si.is_primary = true
         LEFT JOIN dropbox_files df ON df.id = si.image_id
         WHERE ii.item_code = $1 AND ii.inactive = false
         LIMIT 1`,
        [item.item_code]
      );

      if (currentResult.rows.length > 0) {
        const current = currentResult.rows[0];
        cartItems.push({
          item_code: item.item_code,
          quantity: item.quantity,
          current_price: parseFloat(current.total_ws_price),
          item_details: {
            description: current.description,
            sku: current.sku,
            category: current.category,
            image_url: current.image_url
          }
        });
      }
    }

    res.json({ cart_items: cartItems });
  } catch (error) {
    console.error('Error processing reorder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;