import pool from '../db/connection.js';

const SKIP_SIZES = ['100', '110', '120', '130', '160', '180', '500', '550', '600', '700', '750', '800', '850', '851', '900', '950'];
const SIZE_SUFFIXES = ['105', '115', '125', '155', '50', '55', '40', '45', '60', '625', '65', '70', '75', '80', '85', '90', '95', '10', '11', '12', '13', '14', '15', '16', '17', '18'];
const SIZE_NAMES = ['LG', 'MD', 'SM'];

export function extractSku(itemCode: string): string | null {
  if (!itemCode) return null;

  for (const skip of SKIP_SIZES) {
    if (itemCode.includes(skip)) return itemCode;
  }

  for (const suffix of SIZE_NAMES) {
    if (itemCode.endsWith(suffix)) return itemCode.slice(0, -suffix.length);
  }

  for (const suffix of SIZE_SUFFIXES) {
    // strip all trailing digits (e.g. ABC665 -> ABC, BH2C665 -> BH2C)
    if (itemCode.endsWith(suffix)) return itemCode.replace(/\d+$/, '');
  }

  return itemCode;
}

export async function mapSkus(): Promise<{ mapped: number; skipped: number }> {
  console.log(`[${new Date().toLocaleTimeString()}] Mapping SKUs...`);

  const result = await pool.query(
    `SELECT item_code FROM inventory_items
     WHERE item_code NOT IN (SELECT item_code FROM item_sku_map)
     AND item_code IS NOT NULL AND item_code != ''`
  );

  const itemCodes: string[] = result.rows.map((r: any) => r.item_code);
  console.log(`[${new Date().toLocaleTimeString()}] Processing ${itemCodes.length} unmapped item codes...`);

  let mapped = 0;
  let skipped = 0;

  for (const itemCode of itemCodes) {
    const sku = extractSku(itemCode);
    if (!sku) {
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO item_sku_map (item_code, sku)
       VALUES ($1, $2)
       ON CONFLICT (item_code) DO UPDATE SET sku = $2, updated_at = NOW()`,
      [itemCode, sku]
    );
    mapped++;
  }

  console.log(`[${new Date().toLocaleTimeString()}] Done — ${mapped} mapped, ${skipped} skipped`);
  return { mapped, skipped };
}