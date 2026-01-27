import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import pool from '../db/connection.js';

const router = Router();

router.get('/:itemCode', [
  param('itemCode').trim().escape(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { itemCode } = req.params;

    const result = await pool.query(
      `SELECT DISTINCT ON (item_code) 
        ii.item_code, 
        ii.sku, 
        ii.description, 
        ii.category, 
        ii.destination, 
        ii.total_ws_price, 
        ii.inactive, 
        ii.is_catalog, 
        ii.last_updated,
      CASE 
        WHEN df.shared_link IS NOT NULL THEN 
          REPLACE(REPLACE(df.shared_link, '&dl=0', '&raw=1'), '&dl=1', '&raw=1')
        ELSE NULL
      END as image_url
      FROM inventory_items ii
      LEFT JOIN sku_images si ON si.sku = ii.sku AND si.is_primary = true
      LEFT JOIN dropbox_files df ON df.id = si.image_id
      WHERE ii.item_code = $1 AND ii.inactive = false
      LIMIT 1`,
      [itemCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;