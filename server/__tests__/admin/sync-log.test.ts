import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';
import { expectPaginatedResponse } from '../utils.js';

describe('Admin Sync Log API', () => {
  describe('GET /api/admin/sync-log', () => {
    it('should return paginated sync log entries', async () => {
      const response = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 10 });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const log = response.body.items[0];
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('sync_type');
        expect(log).toHaveProperty('status');
        expect(log).toHaveProperty('started_at');
        expect(log).toHaveProperty('completed_at');
        expect(log).toHaveProperty('duration_seconds');
        expect(log).toHaveProperty('items_synced');
      }
    });

    it('should filter sync log by type - access', async () => {
      const response = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 10, type: 'access' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allAccess = response.body.items.every((log: any) => log.sync_type === 'access');
        expect(allAccess).toBe(true);
      }
    });

    it('should filter sync log by type - dropbox', async () => {
      const response = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 10, type: 'dropbox' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allDropbox = response.body.items.every((log: any) => log.sync_type === 'dropbox');
        expect(allDropbox).toBe(true);
      }
    });

    it('should filter sync log by status - success', async () => {
      const response = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 10, status: 'success' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allSuccess = response.body.items.every((log: any) => log.status === 'success');
        expect(allSuccess).toBe(true);
      }
    });

    it('should filter sync log by status - failed', async () => {
      const response = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 10, status: 'failed' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allFailed = response.body.items.every((log: any) => log.status === 'failed');
        expect(allFailed).toBe(true);
      }
    });

    it('should filter by date range', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';
      
      const response = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 10, start_date: startDate, end_date: endDate });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allInRange = response.body.items.every((log: any) => {
          const startedAt = new Date(log.started_at);
          return startedAt >= new Date(startDate) && startedAt <= new Date(endDate);
        });
        expect(allInRange).toBe(true);
      }
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 5 });

      expectPaginatedResponse(response);
      expect(response.body.items.length).toBeLessThanOrEqual(5);
    });

    it('should support pagination', async () => {
      const page1 = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 1, limit: 5 });

      const page2 = await request(app)
        .get('/api/admin/sync-log')
        .query({ page: 2, limit: 5 });

      expectPaginatedResponse(page1);
      expectPaginatedResponse(page2);

      if (page1.body.items.length > 0 && page2.body.items.length > 0) {
        expect(page1.body.items[0].id).not.toBe(page2.body.items[0].id);
      }
    });
  });
});