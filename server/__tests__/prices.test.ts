import request from 'supertest';
import app from '../server';

describe('Prices API', () => {
  describe('GET /api/prices/last-sync', () => {
    it('should return last sync timestamp', async () => {
      const response = await request(app).get('/api/prices/last-sync');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('synced_at');
    });

    it('should return synced_at as a valid date string or null', async () => {
      const response = await request(app).get('/api/prices/last-sync');

      expect(response.status).toBe(200);

      if (response.body.synced_at !== null) {
        expect(new Date(response.body.synced_at).toString()).not.toBe('Invalid Date');
      }
    });
  });
});