import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

// GET /api/admin/verify/catalog
// Returns all active catalog items as item_code + price for client-side comparison
router.get('/catalog', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT item_code, total_ws_price
       FROM inventory_items
       WHERE is_catalog = true AND inactive = false
       ORDER BY item_code`
    );

    res.json(result.rows.map((row: any) => ({
      item_code: row.item_code,
      price: parseFloat(row.total_ws_price),
    })));
  } catch (error) {
    console.error('Error fetching catalog items for verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/verify/destination?name=Abaco
// Returns all active items for a destination as item_code + price for client-side comparison
router.get('/destination', [
  query('name').isString().trim().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const name = req.query.name as string;

    const result = await pool.query(
      `SELECT item_code, total_ws_price
       FROM inventory_items
       WHERE is_catalog = false AND inactive = false AND destination_raw = $1
       ORDER BY item_code`,
      [name]
    );

    res.json({
      destination: name,
      items: result.rows.map((row: any) => ({
        item_code: row.item_code,
        price: parseFloat(row.total_ws_price),
      })),
    });
  } catch (error) {
    console.error('Error fetching destination items for verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;