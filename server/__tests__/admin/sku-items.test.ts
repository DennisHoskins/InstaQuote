import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';
import { expectPaginatedResponse } from '../utils.js';

describe('Admin SKU Items API', () => {
  describe('GET /api/admin/sku-items', () => {
    it('should return paginated SKU item mappings', async () => {
      const response = await request(app)
        .get('/api/admin/sku-items')
        .query({ page: 1, limit: 25 });

      expectPaginatedResponse(response);

      if (response.body.items.length > 0) {
        const item = response.body.items[0];
        expect(item).toHaveProperty('item_code');
        expect(item).toHaveProperty('sku');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('destination');
        expect(item).toHaveProperty('inactive');
      }
    });

    it('should search by item code', async () => {
      const response = await request(app)
        .get('/api/admin/sku-items')
        .query({ page: 1, limit: 25, search: 'ABC' });

      expectPaginatedResponse(response);

      if (response.body.items.length > 0) {
        const allMatch = response.body.items.every((item: any) =>
          item.item_code.toUpperCase().includes('ABC') ||
          item.sku.toUpperCase().includes('ABC')
        );
        expect(allMatch).toBe(true);
      }
    });
  });
});