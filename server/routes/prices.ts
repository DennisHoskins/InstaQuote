import { Router, Request, Response } from 'express';
import pool from '../db/connection.js';

const router = Router();

// GET /api/prices/last-sync
router.get('/last-sync', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT synced_at FROM metal_prices ORDER BY synced_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ synced_at: null });
    }

    res.json({ synced_at: result.rows[0].synced_at });
  } catch (error) {
    console.error('Error fetching last sync time:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;