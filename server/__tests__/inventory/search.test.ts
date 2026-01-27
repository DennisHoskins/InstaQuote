import request from 'supertest';
import app from '../../server.js';
import { expectPaginatedResponse } from '../utils.js';

describe('Search API', () => {
  describe('GET /api/search', () => {
    it('should search across all items (catalog and destinations)', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ search: 'bracelet', page: 1, limit: 10 });

      expectPaginatedResponse(response);
    });

    it('should return empty results for non-existent search term', async () => {
      const response = await request(app)
        .get('/api/search')
        .query({ search: 'xyznonexistent123', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });
});