import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';

describe('Admin Sync API', () => {
  describe('GET /api/admin/sync/missing-links-count', () => {
    it('should return missing links count', async () => {
      const response = await request(app)
        .get('/api/admin/sync/missing-links-count');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('missingLinks');
      expect(typeof response.body.missingLinks).toBe('number');
      expect(response.body.missingLinks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/admin/sync/status/:syncType', () => {
    it('should return status for dropbox_crawl', async () => {
      const response = await request(app)
        .get('/api/admin/sync/status/dropbox_crawl');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isRunning');
      expect(typeof response.body.isRunning).toBe('boolean');

      if (response.body.isRunning) {
        expect(response.body).toHaveProperty('startedAt');
        expect(response.body).toHaveProperty('userName');
        expect(response.body).toHaveProperty('syncId');
      }
    });

    it('should return status for dropbox_links', async () => {
      const response = await request(app)
        .get('/api/admin/sync/status/dropbox_links');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isRunning');
      expect(typeof response.body.isRunning).toBe('boolean');
    });

    it('should return status for sku_mapping', async () => {
      const response = await request(app)
        .get('/api/admin/sync/status/sku_mapping');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isRunning');
      expect(typeof response.body.isRunning).toBe('boolean');
    });

    it('should return 400 for invalid sync type', async () => {
      const response = await request(app)
        .get('/api/admin/sync/status/invalid_type');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});