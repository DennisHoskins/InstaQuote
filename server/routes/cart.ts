import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import pool from '../db/connection.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/cart
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT item_code, quantity, unit_price, added_at
       FROM user_cart
       WHERE user_id = $1
       ORDER BY added_at ASC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/cart
router.post('/', [
  body('item_code').isString().trim().notEmpty(),
  body('quantity').isInt({ min: 1 }).toInt(),
  body('unit_price').isFloat({ min: 0 }).toFloat(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { item_code, quantity, unit_price } = req.body;

    const result = await pool.query(
      `INSERT INTO user_cart (user_id, user_email, user_name, item_code, quantity, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, item_code)
       DO UPDATE SET quantity = $5, unit_price = $6
       RETURNING item_code, quantity, unit_price, added_at`,
      [req.user!.id, req.user!.email, req.user!.username, item_code, quantity, unit_price]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error upserting cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cart/:item_code
router.delete('/:item_code', [
  param('item_code').isString().trim().notEmpty(),
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    await pool.query(
      `DELETE FROM user_cart WHERE user_id = $1 AND item_code = $2`,
      [req.user!.id, req.params.item_code]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/cart
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `DELETE FROM user_cart WHERE user_id = $1`,
      [req.user!.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;