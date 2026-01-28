import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';
import { expectPaginatedResponse } from '../utils.js';

describe('Admin SKUs API', () => {
  describe('GET /api/admin/skus', () => {
    it('should return paginated list of SKUs with item counts', async () => {
      const response = await request(app)
        .get('/api/admin/skus')
        .query({ page: 1, limit: 25 });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const sku = response.body.items[0];
        expect(sku).toHaveProperty('sku');
        expect(sku).toHaveProperty('item_count');
        expect(sku).toHaveProperty('image_count');
        expect(sku).toHaveProperty('has_primary_image');
        expect(sku).toHaveProperty('primary_image_url');
        expect(typeof sku.item_count).toBe('number');
        expect(typeof sku.image_count).toBe('number');
        expect(typeof sku.has_primary_image).toBe('boolean');
      }
    });

    it('should search SKUs', async () => {
      const response = await request(app)
        .get('/api/admin/skus')
        .query({ page: 1, limit: 25, search: 'ABC' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const hasSearch = response.body.items.every((sku: any) =>
          sku.sku.toUpperCase().includes('ABC')
        );
        expect(hasSearch).toBe(true);
      }
    });

    it('should filter SKUs by image status', async () => {
      const response = await request(app)
        .get('/api/admin/skus')
        .query({ page: 1, limit: 25, has_image: true });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allHaveImages = response.body.items.every((sku: any) => sku.image_count > 0);
        expect(allHaveImages).toBe(true);
      }
    });

    it('should filter SKUs without images', async () => {
      const response = await request(app)
        .get('/api/admin/skus')
        .query({ page: 1, limit: 25, has_image: false });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const noneHaveImages = response.body.items.every((sku: any) => sku.image_count === 0);
        expect(noneHaveImages).toBe(true);
      }
    });
  });

  describe('GET /api/admin/skus/:sku', () => {
    it('should return SKU details with all items', async () => {
      const response = await request(app)
        .get('/api/admin/skus/ABC6');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sku', 'ABC6');
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('images');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(Array.isArray(response.body.images)).toBe(true);
      
      if (response.body.items.length > 0) {
        const item = response.body.items[0];
        expect(item).toHaveProperty('item_code');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('total_ws_price');
      }
    });

    it('should return 404 for non-existent SKU', async () => {
      const response = await request(app)
        .get('/api/admin/skus/DOESNOTEXIST999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});