import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';
import { expectPaginatedResponse } from '../utils.js';

describe('Admin Metals API', () => {
  describe('GET /api/admin/metals', () => {
    it('should return paginated metals price history', async () => {
      const response = await request(app)
        .get('/api/admin/metals')
        .query({ page: 1, limit: 25 });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const entry = response.body.items[0];
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('gold_price');
        expect(entry).toHaveProperty('ss_price');
        expect(entry).toHaveProperty('synced_at');
        expect(typeof entry.gold_price).toBe('number');
        expect(typeof entry.ss_price).toBe('number');
      }
    });

    it('should filter by date range', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';
      
      const response = await request(app)
        .get('/api/admin/metals')
        .query({ page: 1, limit: 25, start_date: startDate, end_date: endDate });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allInRange = response.body.items.every((entry: any) => {
          const syncedDate = new Date(entry.synced_at);
          return syncedDate >= new Date(startDate) && syncedDate <= new Date(endDate);
        });
        expect(allInRange).toBe(true);
      }
    });

    it('should order by synced_at descending by default', async () => {
      const response = await request(app)
        .get('/api/admin/metals')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);
      
      if (response.body.items.length > 1) {
        const dates = response.body.items.map((entry: any) => new Date(entry.synced_at).getTime());
        const isDescending = dates.every((date: number, i: number) => 
          i === 0 || date <= dates[i - 1]
        );
        expect(isDescending).toBe(true);
      }
    });
  });
});