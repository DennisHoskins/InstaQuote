import { Router, Request, Response } from 'express';
import pool from '../../db/connection.js';

const router = Router();

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get sync stats for each type
    const syncStatsQuery = `
      WITH sync_stats AS (
        SELECT 
          sync_type,
          COUNT(*) as total_syncs,
          AVG(duration_seconds) as avg_duration,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as success_rate
        FROM sync_log
        WHERE started_at >= NOW() - INTERVAL '30 days'
        GROUP BY sync_type
      ),
      total_runs AS (
        SELECT 
          sync_type,
          COUNT(*) as total_runs
        FROM sync_log
        GROUP BY sync_type
      ),
      last_syncs AS (
        SELECT DISTINCT ON (sync_type)
          sync_type,
          items_synced,
          duration_seconds,
          status,
          started_at
        FROM sync_log
        ORDER BY sync_type, started_at DESC
      )
      SELECT 
        ss.sync_type,
        COALESCE(ss.success_rate, 0) as success_rate,
        COALESCE(ss.avg_duration, 0) as avg_duration,
        COALESCE(tr.total_runs, 0) as total_runs,
        ls.items_synced as last_items_synced,
        ls.duration_seconds as last_duration,
        ls.status as last_status,
        ls.started_at as last_started_at
      FROM sync_stats ss
      LEFT JOIN total_runs tr ON ss.sync_type = tr.sync_type
      LEFT JOIN last_syncs ls ON ss.sync_type = ls.sync_type
    `;

    // Get orders stats
    const ordersStatsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
      WHERE deleted_at IS NULL
    `;    

    // Get items stats
    const itemsStatsQuery = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN sku IS NOT NULL THEN 1 END) as items_with_sku
      FROM inventory_items
      WHERE inactive = false
    `;

    // Get SKU stats
    const skusStatsQuery = `
      WITH sku_image_counts AS (
        SELECT 
          i.sku,
          COUNT(DISTINCT si.image_id) as image_count
        FROM inventory_items i
        LEFT JOIN sku_images si ON si.sku = i.sku
        WHERE i.sku IS NOT NULL AND i.sku != ''
        GROUP BY i.sku
      )
      SELECT 
        COUNT(DISTINCT sku) as total_skus,
        COUNT(CASE WHEN image_count > 0 THEN 1 END) as skus_with_images,
        COUNT(CASE WHEN image_count = 0 THEN 1 END) as skus_without_images
      FROM sku_image_counts
    `;

    // Get images stats
    const imagesStatsQuery = `
      SELECT 
        COUNT(*) as total_images,
        COUNT(CASE WHEN file_extension IN ('.jpg', '.jpeg', '.png', '.gif') THEN 1 END) as web_images
      FROM dropbox_files
    `;

    const linkedWebImagesQuery = `
      SELECT COUNT(DISTINCT df.id) as linked_web_images
      FROM dropbox_files df
      JOIN sku_images si ON si.image_id = df.id
      WHERE df.file_extension IN ('.jpg', '.jpeg', '.png', '.gif')
    `;

    // Get SKU-image mapping stats
    const skuImageStatsQuery = `
      SELECT 
        COUNT(*) as total_mappings,
        COUNT(DISTINCT sku) as skus_with_images
      FROM sku_images
    `;

    // Get current metal prices
    const currentMetalsQuery = `
      SELECT gold_price, ss_price
      FROM metal_prices
      ORDER BY synced_at DESC
      LIMIT 1
    `;

    // Get metal price history (last 30 days)
    const metalsHistoryQuery = `
      SELECT gold_price as gold, ss_price as silver, synced_at
      FROM metal_prices
      WHERE synced_at >= NOW() - INTERVAL '30 days'
      ORDER BY synced_at ASC
    `;

    // Get file type breakdown
    const fileTypeBreakdownQuery = `
      SELECT 
        file_extension as type,
        COUNT(*) as count,
        ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percent
      FROM dropbox_files
      GROUP BY file_extension
      ORDER BY count DESC
    `;

    const [
      syncStatsResult,
      ordersStatsResult,
      itemsStatsResult,
      skusStatsResult,
      imagesStatsResult,
      linkedWebImagesResult,
      skuImageStatsResult,
      currentMetalsResult,
      metalsHistoryResult,
      fileTypeBreakdownResult
    ] = await Promise.all([
      pool.query(syncStatsQuery),
      pool.query(ordersStatsQuery),
      pool.query(itemsStatsQuery),
      pool.query(skusStatsQuery),
      pool.query(imagesStatsQuery),
      pool.query(linkedWebImagesQuery),
      pool.query(skuImageStatsQuery),
      pool.query(currentMetalsQuery),
      pool.query(metalsHistoryQuery),
      pool.query(fileTypeBreakdownQuery)
    ]);

    // Organize sync stats by type
    const syncStats: any = {
      access: {
        successRate: 0,
        averageSyncTime: 0,
        lastSync: null
      },
      dropbox_crawl: {
        successRate: 0,
        averageSyncTime: 0,
        lastSync: null
      },
      dropbox_links: {
        successRate: 0,
        averageSyncTime: 0,
        lastSync: null
      },
      sku_mapping: {
        successRate: 0,
        averageSyncTime: 0,
        lastSync: null
      }
    };

    syncStatsResult.rows.forEach((row: any) => {
      const stats = {
        successRate: parseFloat(row.success_rate) || 0,
        averageSyncTime: parseFloat(row.avg_duration) || 0,
        totalRuns: parseInt(row.total_runs) || 0,
        lastSync: row.last_started_at ? {
          itemsCount: parseInt(row.last_items_synced) || 0,
          duration: parseFloat(row.last_duration) || 0,
          status: row.last_status,
          timestamp: row.last_started_at
        } : null
      };

      if (row.sync_type === 'access') {
        syncStats.access = stats;
      } else if (row.sync_type === 'dropbox_crawl') {
        syncStats.dropbox_crawl = stats;
      } else if (row.sync_type === 'dropbox_links') {
        syncStats.dropbox_links = stats;
      } else if (row.sync_type === 'sku_mapping') {
        syncStats.sku_mapping = stats;
      }
    });

    // Process orders stats
    const ordersData = {
      totalOrders: parseInt(ordersStatsResult.rows[0].total_orders) || 0,
      totalRevenue: parseFloat(ordersStatsResult.rows[0].total_revenue) || 0,
    };    

    // Process items stats
    const totalItems = parseInt(itemsStatsResult.rows[0].total_items);
    const itemsWithSku = parseInt(itemsStatsResult.rows[0].items_with_sku);
    
    const itemsStats = {
      totalItems,
      itemsWithSku,
      itemsWithImages: 0 // This would need a more complex query
    };

    // Process SKU stats
    const totalSkus = parseInt(skusStatsResult.rows[0].total_skus);
    const skusWithImages = parseInt(skusStatsResult.rows[0].skus_with_images);
    const skusWithoutImages = parseInt(skusStatsResult.rows[0].skus_without_images);
    
    const skuStats = {
      totalSkus,
      skusWithImages,
      skusWithoutImages,
      coveragePercent: totalSkus > 0 ? parseFloat(((skusWithImages / totalSkus) * 100).toFixed(1)) : 0
    };

    // Process images stats
    const totalImages = parseInt(imagesStatsResult.rows[0].total_images);
    const webImages = parseInt(imagesStatsResult.rows[0].web_images);
    const linkedWebImages = parseInt(linkedWebImagesResult.rows[0].linked_web_images);
    
    const imagesStats = {
      totalImages,
      webImages,
      linkedWebImages,
      webImagesPercent: webImages > 0 ? parseFloat(((linkedWebImages / webImages) * 100).toFixed(1)) : 0,
      fileTypeBreakdown: fileTypeBreakdownResult.rows.map((row: any) => ({
        type: row.type,
        count: parseInt(row.count),
        percent: parseFloat(row.percent)
      }))
    };

    // Process SKU-image stats
    const imageMatchStats = {
      totalMappings: parseInt(skuImageStatsResult.rows[0].total_mappings),
      skusWithImages: parseInt(skuImageStatsResult.rows[0].skus_with_images)
    };

    // Process metals data
    const currentMetals = currentMetalsResult.rows[0] || { gold_price: 0, ss_price: 0 };
    const metalsHistory = metalsHistoryResult.rows;
    
    const metalsData = {
      current: {
        gold: parseFloat(currentMetals.gold_price),
        silver: parseFloat(currentMetals.ss_price)
      },
      history: metalsHistory.map((row: any) => ({
        gold: parseFloat(row.gold),
        silver: parseFloat(row.silver),
        date: row.synced_at
      })),
      lastSync: metalsHistory.length > 0 ? metalsHistory[metalsHistory.length - 1].synced_at : null
    };

    res.json({
      syncStats,
      ordersData,
      itemsStats,
      skuStats,
      imagesStats,
      imageMatchStats,
      metalsData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;