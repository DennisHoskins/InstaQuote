import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
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

// GET /api/admin/verify/destination
// Returns all active destination items (raw rows; may include duplicate item_codes
// across destinations).
router.get('/destination', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT item_code, total_ws_price
       FROM inventory_items
       WHERE is_catalog = false AND inactive = false
       ORDER BY item_code`
    );

    res.json(result.rows.map((row: any) => ({
      item_code: row.item_code,
      price: parseFloat(row.total_ws_price),
    })));
  } catch (error) {
    console.error('Error fetching destination items for verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/verify/destination/:name
// Returns active destination items filtered to one destination
router.get('/destination/:name', [
  param('name').trim().isString().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name } = req.params;

    const result = await pool.query(
      `SELECT item_code, total_ws_price
       FROM inventory_items
       WHERE is_catalog = false AND inactive = false AND destination = $1
       ORDER BY item_code`,
      [name]
    );

    res.json(result.rows.map((row: any) => ({
      item_code: row.item_code,
      price: parseFloat(row.total_ws_price),
    })));
  } catch (error) {
    console.error('Error fetching destination items for verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/verify/items/:itemCode
// Returns all active rows for a given item code (includes destination + price).
// Used to probe whether an XLS file is single-destination or all-destinations.
router.get('/items/:itemCode', [
  param('itemCode').trim().isString().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { itemCode } = req.params;

    const result = await pool.query(
      `SELECT item_code, destination, total_ws_price
       FROM inventory_items
       WHERE item_code = $1 AND inactive = false
       ORDER BY destination`,
      [itemCode]
    );

    res.json(result.rows.map((row: any) => ({
      item_code: row.item_code,
      destination: row.destination,
      price: parseFloat(row.total_ws_price),
    })));
  } catch (error) {
    console.error('Error fetching item rows for verify:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;