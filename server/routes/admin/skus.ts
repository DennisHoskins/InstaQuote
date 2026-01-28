import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import pool from '../../db/connection.js';

const router = Router();

// Get paginated list of SKUs
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().isString(),
  query('has_image').optional().isBoolean().toBoolean(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string | undefined;
    const hasImage = req.query.has_image as boolean | undefined;
    const offset = (page - 1) * limit;

    let queryText = `
      WITH sku_image_counts AS (
        SELECT 
          sku,
          COUNT(*) as image_count,
          BOOL_OR(is_primary) as has_primary_image
        FROM sku_images
        GROUP BY sku
      ),
      sku_primary_images AS (
        SELECT DISTINCT ON (si.sku)
          si.sku,
          df.shared_link
        FROM sku_images si
        JOIN dropbox_files df ON df.id = si.image_id
        WHERE si.is_primary = true
        ORDER BY si.sku, si.confidence DESC
      )
      SELECT 
        i.sku,
        COUNT(DISTINCT i.item_code) as item_count,
        COALESCE(sic.image_count, 0) as image_count,
        COALESCE(sic.has_primary_image, false) as has_primary_image,
        spi.shared_link as primary_image_url
      FROM inventory_items i
      LEFT JOIN sku_image_counts sic ON sic.sku = i.sku
      LEFT JOIN sku_primary_images spi ON spi.sku = i.sku
      WHERE i.sku IS NOT NULL AND i.sku != ''
    `;
    const queryParams: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      queryText += ` AND i.sku ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }

    const rawHasImage = req.query.has_image;

    const hasImageBool =
      rawHasImage === 'true'
        ? true
        : rawHasImage === 'false'
        ? false
        : undefined;

    if (hasImageBool === true) {
      queryText += ` AND sic.image_count > 0`;
    } else if (hasImageBool === false) {
      queryText += ` AND (sic.image_count IS NULL OR sic.image_count = 0)`;
    }

    queryText += ` GROUP BY i.sku, sic.image_count, sic.has_primary_image, spi.shared_link`;

    const countQuery = `SELECT COUNT(*) FROM (${queryText}) as count_query`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    queryText += ` ORDER BY i.sku LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(queryText, queryParams);

    res.json({
      items: result.rows.map((row: any) => ({
        sku: row.sku,
        item_count: parseInt(row.item_count),
        image_count: parseInt(row.image_count),
        has_primary_image: row.has_primary_image,
        primary_image_url: row.primary_image_url
      })),
      total,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get SKU details with all items and images
router.get('/:sku', [
  param('sku').trim().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { sku } = req.params;

    // Get all items for this SKU
    const itemsResult = await pool.query(
      `SELECT item_code, description, category, destination, total_ws_price, inactive
       FROM inventory_items
       WHERE sku = $1
       ORDER BY item_code`,
      [sku]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    // Get all images for this SKU
    const imagesResult = await pool.query(
      `SELECT 
        si.id as mapping_id,
        si.is_primary,
        si.match_type,
        si.confidence,
        df.id as image_id,
        df.file_name,
        df.file_name_no_ext,
        df.folder_path,
        df.file_extension,
        df.shared_link
      FROM sku_images si
      JOIN dropbox_files df ON si.image_id = df.id
      WHERE si.sku = $1
      ORDER BY si.is_primary DESC, si.confidence DESC`,
      [sku]
    );

    res.json({
      sku,
      items: itemsResult.rows,
      images: imagesResult.rows
    });
  } catch (error) {
    console.error('Error fetching SKU details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;