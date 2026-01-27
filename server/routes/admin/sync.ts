import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../../db/connection.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Trigger Dropbox crawl
router.post('/dropbox-crawl', [
  body('user_name').isString().trim().notEmpty(),
  body('dropbox_token').isString().trim().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { user_name, dropbox_token } = req.body;

    const scriptPath = path.join(__dirname, '../../scripts/dropbox-crawl.js');
    
    const child = spawn('node', [
      scriptPath,
      '--user', user_name,
      '--token', dropbox_token
    ]);

    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('Dropbox crawl completed successfully');
      } else {
        console.error(`Dropbox crawl failed with code ${code}`);
      }
    });

    res.json({ message: 'Dropbox crawl started', status: 'running' });
  } catch (error) {
    console.error('Error starting dropbox crawl:', error);
    res.status(500).json({ error: 'Failed to start dropbox crawl' });
  }
});

// Trigger link creation
router.post('/create-links', [
  body('user_name').isString().trim().notEmpty(),
  body('dropbox_token').isString().trim().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { user_name, dropbox_token } = req.body;

    const scriptPath = path.join(__dirname, '../../scripts/dropbox-create-links.js');
    
    const child = spawn('node', [
      scriptPath,
      '--user', user_name,
      '--token', dropbox_token
    ]);

    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('Link creation completed successfully');
      } else {
        console.error(`Link creation failed with code ${code}`);
      }
    });

    res.json({ message: 'Link creation started', status: 'running' });
  } catch (error) {
    console.error('Error starting link creation:', error);
    res.status(500).json({ error: 'Failed to start link creation' });
  }
});

// Generate SKU image mappings
router.post('/generate-mappings', [
  body('user_name').isString().trim().notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { user_name } = req.body;

    const scriptPath = path.join(__dirname, '../../scripts/generate-sku-dropbox-mappings.js');
    
    const child = spawn('node', [
      scriptPath,
      '--user', user_name
    ]);

    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('Mapping generation completed successfully');
      } else {
        console.error(`Mapping generation failed with code ${code}`);
      }
    });

    res.json({ message: 'Mapping generation started', status: 'running' });
  } catch (error) {
    console.error('Error starting mapping generation:', error);
    res.status(500).json({ error: 'Failed to start mapping generation' });
  }
});

// Delete a SKU image mapping
router.delete('/mapping/:id', [
  param('id').isInt().toInt(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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
  } catch (error) {
    console.error('Error deleting SKU image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;