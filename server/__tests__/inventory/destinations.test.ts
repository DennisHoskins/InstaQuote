import request from 'supertest';
import app from '../../server.js';
import { expectPaginatedResponse } from '../utils.js';

describe('Destinations API', () => {
  describe('GET /api/destinations', () => {
    it('should return list of unique destinations', async () => {
      const response = await request(app).get('/api/destinations');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should search destinations by name', async () => {
      const response = await request(app)
        .get('/api/destinations')
        .query({ search: 'aruba' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const hasSearch = response.body.every((dest: string) =>
          dest.toLowerCase().includes('aruba')
        );
        expect(hasSearch).toBe(true);
      }
    });
  });

  describe('GET /api/destinations/:destination/items', () => {
    it('should return paginated items for a specific destination', async () => {
      const response = await request(app)
        .get('/api/destinations/Aruba/items')
        .query({ page: 1, limit: 10 });

      expectPaginatedResponse(response);
    });

    it('should search destination items by item code and description', async () => {
      const response = await request(app)
        .get('/api/destinations/Aruba/items')
        .query({ page: 1, limit: 10, search: 'bracelet' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const hasSearch = response.body.items.every((item: any) =>
          item.item_code.toLowerCase().includes('bracelet') ||
          item.description.toLowerCase().includes('bracelet')
        );
        expect(hasSearch).toBe(true);
      }
    });
  });
});