import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';
import { expectPaginatedResponse } from '../utils.js';

describe('Admin SKU Images API', () => {
  describe('GET /api/admin/sku-images', () => {
    it('should return paginated SKU image mappings', async () => {
      const response = await request(app)
        .get('/api/admin/sku-images')
        .query({ page: 1, limit: 25 });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const mapping = response.body.items[0];
        expect(mapping).toHaveProperty('id');
        expect(mapping).toHaveProperty('sku');
        expect(mapping).toHaveProperty('image_id');
        expect(mapping).toHaveProperty('match_type');
        expect(mapping).toHaveProperty('is_primary');
        expect(mapping).toHaveProperty('confidence');
        expect(mapping).toHaveProperty('file_name_no_ext');
        expect(mapping).toHaveProperty('folder_path');
        expect(mapping).toHaveProperty('shared_link');
      }
    });

    it('should filter by SKU', async () => {
      const response = await request(app)
        .get('/api/admin/sku-images')
        .query({ page: 1, limit: 25, sku: 'ABC6' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allMatchSku = response.body.items.every((item: any) => item.sku === 'ABC6');
        expect(allMatchSku).toBe(true);
      }
    });

    it('should filter by match type', async () => {
      const response = await request(app)
        .get('/api/admin/sku-images')
        .query({ page: 1, limit: 25, match_type: 'exact' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allExact = response.body.items.every((item: any) => item.match_type === 'exact');
        expect(allExact).toBe(true);
      }
    });

    it('should filter by primary status', async () => {
      const response = await request(app)
        .get('/api/admin/sku-images')
        .query({ page: 1, limit: 25, is_primary: true });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allPrimary = response.body.items.every((item: any) => item.is_primary === true);
        expect(allPrimary).toBe(true);
      }
    });
  });

describe('GET /api/admin/sku-images/:id', () => {
    it('should return a single SKU image mapping', async () => {
      // First get a mapping to test with
      const listResponse = await request(app)
        .get('/api/admin/sku-images')
        .query({ page: 1, limit: 1 });

      if (listResponse.body.items.length > 0) {
        const mappingId = listResponse.body.items[0].id;
        
        const response = await request(app)
          .get(`/api/admin/sku-images/${mappingId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', mappingId);
        expect(response.body).toHaveProperty('sku');
        expect(response.body).toHaveProperty('image_id');
        expect(response.body).toHaveProperty('match_type');
        expect(response.body).toHaveProperty('is_primary');
        expect(response.body).toHaveProperty('confidence');
        expect(response.body).toHaveProperty('file_name_no_ext');
        expect(response.body).toHaveProperty('file_name');
        expect(response.body).toHaveProperty('folder_path');
        expect(response.body).toHaveProperty('file_extension');
      }
    });

    it('should return 404 for non-existent mapping', async () => {
      const response = await request(app)
        .get('/api/admin/sku-images/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app)
        .get('/api/admin/sku-images/invalid');

      expect(response.status).toBe(400);
    });
  });  
});