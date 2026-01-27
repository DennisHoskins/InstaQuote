import request from 'supertest';
import app from '../../server.js';
import { expectPaginatedResponse } from '../utils.js';

describe('Catalog API', () => {
  describe('GET /api/catalog/items', () => {
    it('should return paginated catalog items', async () => {
      const response = await request(app)
        .get('/api/catalog/items')
        .query({ page: 1, limit: 10 });

      expectPaginatedResponse(response);
    });

    it('should search catalog items by item code and description', async () => {
      const response = await request(app)
        .get('/api/catalog/items')
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