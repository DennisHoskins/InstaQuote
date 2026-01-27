import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';
import { expectPaginatedResponse } from '../utils.js';

describe('Admin Items API', () => {
  describe('GET /api/admin/items', () => {
    it('should return paginated items list', async () => {
      const response = await request(app)
        .get('/api/admin/items')
        .query({ page: 1, limit: 25 });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const item = response.body.items[0];
        expect(item).toHaveProperty('item_code');
        expect(item).toHaveProperty('sku');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('destination');
        expect(item).toHaveProperty('total_ws_price');
        expect(item).toHaveProperty('has_image');
      }
    });

    it('should search items by item code and description', async () => {
      const response = await request(app)
        .get('/api/admin/items')
        .query({ page: 1, limit: 25, search: 'bracelet' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const hasSearch = response.body.items.every((item: any) =>
          item.item_code.toLowerCase().includes('bracelet') ||
          item.description.toLowerCase().includes('bracelet')
        );
        expect(hasSearch).toBe(true);
      }
    });

    it('should filter items by has_image status', async () => {
      const response = await request(app)
        .get('/api/admin/items')
        .query({ page: 1, limit: 25, has_image: true });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allHaveImages = response.body.items.every((item: any) => item.has_image === true);
        expect(allHaveImages).toBe(true);
      }
    });

    it('should filter items without images', async () => {
      const response = await request(app)
        .get('/api/admin/items')
        .query({ page: 1, limit: 25, has_image: false });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const noneHaveImages = response.body.items.every((item: any) => item.has_image === false);
        expect(noneHaveImages).toBe(true);
      }
    });
  });
});