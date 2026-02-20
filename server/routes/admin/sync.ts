import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { body, param, validationResult } from 'express-validator';
import { crawlDropbox, createLinks, getMissingLinksCount } from '../../services/dropbox.js';
import { generateMappings, deleteAllMappings } from '../../services/sku-mapping.js';
import { startSync, completeSync, failSync } from '../../services/sync-log.js';
import pool from '../../db/connection.js';

const router = Router();

// Get missing links count
router.get('/missing-links-count', async (req: AuthRequest, res: Response) => {
  try {
    const missingLinks = await getMissingLinksCount();
    res.json({ missingLinks });
  } catch (error: any) {
    console.error('Error fetching missing links count:', error);
    res.status(500).json({ error: 'Failed to fetch missing links count' });
  }
});

// Get sync status for a specific type
router.get('/status/:syncType', async (req: AuthRequest, res: Response) => {
  try {
    const syncType = Array.isArray(req.params.syncType) 
      ? req.params.syncType[0] 
      : req.params.syncType;
    
    // Validate sync type
    const validTypes = ['dropbox_crawl', 'dropbox_links', 'sku_mapping'];
    if (!validTypes.includes(syncType)) {
      return res.status(400).json({ error: 'Invalid sync type' });
    }

    const result = await pool.query(
      `SELECT id, started_at, user_name, items_synced, status
       FROM sync_log 
       WHERE sync_type = $1
       ORDER BY started_at DESC 
       LIMIT 1`,
      [syncType]
    );

    if (result.rows.length > 0 && result.rows[0].status === 'running') {
      const row = result.rows[0];
      res.json({
        isRunning: true,
        startedAt: row.started_at,
        userName: row.user_name,
        syncId: row.id
      });
    } else {
      res.json({ isRunning: false });
    }
  } catch (error: any) {
    console.error('Error checking sync status:', error);
    res.status(500).json({ error: 'Failed to check sync status' });
  }
});

// Trigger Dropbox crawl
router.post('/dropbox-crawl', [
  body('dropbox_token').isString().trim().notEmpty(),
], async (req: AuthRequest, res: Response) => {
  const { dropbox_token } = req.body;
  const user_name = req.user!.username;
  const startedAt = new Date();
  let syncId: number | null = null;

  try {
    syncId = await startSync(user_name, 'dropbox_crawl');
    const result = await crawlDropbox(dropbox_token);
    await completeSync(syncId, startedAt, result.itemsChanged);
    
    res.json({ 
      message: 'Dropbox crawl completed successfully', 
      status: 'success',
      itemsChanged: result.itemsChanged
    });
  } catch (error: any) {
    console.error('Error during dropbox crawl:', error);
    if (syncId) {
      await failSync(syncId, startedAt, error.message);
    }
    res.status(500).json({ 
      error: 'Dropbox crawl failed',
      message: error.message
    });
  }
});

// Trigger link creation
router.post('/create-links', [
  body('dropbox_token').isString().trim().notEmpty(),
], async (req: AuthRequest, res: Response) => {
  const { dropbox_token } = req.body;
  const user_name = req.user!.username;
  const startedAt = new Date();
  let syncId: number | null = null;

  try {
    // Check how many links are missing
    const missingLinks = await getMissingLinksCount();
    const threshold = 100;

    syncId = await startSync(user_name, 'dropbox_links');

    if (missingLinks <= threshold) {
      // Synchronous execution for small batches
      const result = await createLinks(dropbox_token);
      await completeSync(syncId, startedAt, result.linksCreated);
      
      res.json({ 
        message: `Link creation completed (${result.linksCreated} links created, ${result.orphansDeleted} orphans deleted)`, 
        status: 'success',
        linksCreated: result.linksCreated,
        orphansDeleted: result.orphansDeleted
      });
    } else {
      // Asynchronous execution for large batches
      createLinks(dropbox_token)
        .then(result => completeSync(syncId!, startedAt, result.linksCreated))
        .catch(error => failSync(syncId!, startedAt, error.message));
      
      res.json({ 
        message: `Link creation started (${missingLinks} links to create)`, 
        status: 'running'
      });
    }
  } catch (error: any) {
    console.error('Error during link creation:', error);
    if (syncId) {
      await failSync(syncId, startedAt, error.message);
    }
    res.status(500).json({ 
      error: 'Link creation failed',
      message: error.message
    });
  }
});

// Generate SKU image mappings
router.post('/generate-mappings', async (req: AuthRequest, res: Response) => {
  const user_name = req.user!.username;
  const startedAt = new Date();
  let syncId: number | null = null;

  try {
    syncId = await startSync(user_name, 'sku_mapping');
    const result = await generateMappings();
    await completeSync(syncId, startedAt, result.mappingsCreated);
    
    res.json({ 
      message: 'Mapping generation completed successfully', 
      status: 'success',
      mappingsCreated: result.mappingsCreated,
      orphansDeleted: result.orphansDeleted
    });
  } catch (error: any) {
    console.error('Error during mapping generation:', error);
    if (syncId) {
      await failSync(syncId, startedAt, error.message);
    }
    res.status(500).json({ 
      error: 'Mapping generation failed',
      message: error.message
    });
  }
});

// Delete all SKU image mappings
router.delete('/mappings/all', async (req: AuthRequest, res: Response) => {
  const user_name = req.user!.username;
  const startedAt = new Date();
  let syncId: number | null = null;

  try {
    syncId = await startSync(user_name, 'sku_mapping');
    const result = await deleteAllMappings();
    
    // Log as negative number to indicate deletion
    await pool.query(
      `UPDATE sync_log
       SET status = 'success',
           completed_at = NOW(),
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - $1)),
           items_synced = $2,
           error_message = 'Deleted all mappings'
       WHERE id = $3`,
      [startedAt, -result.mappingsDeleted, syncId]
    );
    
    res.json({ 
      deleted: true,
      mappingsDeleted: result.mappingsDeleted
    });
  } catch (error: any) {
    console.error('Error deleting all mappings:', error);
    if (syncId) {
      await failSync(syncId, startedAt, error.message);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a single SKU image mapping
router.delete('/mapping/:id', [
  param('id').isInt().toInt(),
], async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM sku_images WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    res.json({ deleted: true });
  } catch (error: any) {
    console.error('Error deleting SKU image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/mark-failed', [
  param('id').isInt(),
  body('error_message').isString().trim().notEmpty(),
], async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { error_message } = req.body;

  try {
    const result = await pool.query(
      `UPDATE sync_log
       SET status = 'failed',
           error_message = $1,
           completed_at = NOW()
       WHERE id = $2 AND status = 'running'
       RETURNING *`,
      [error_message, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync log not found or not in running state' });
    }

    res.json({ message: 'Sync log marked as failed', log: result.rows[0] });
  } catch (error) {
    console.error('Error marking sync as failed:', error);
    res.status(500).json({ error: 'Failed to update sync log' });
  }
});

export default router;