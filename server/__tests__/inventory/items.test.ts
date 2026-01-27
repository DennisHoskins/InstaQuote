import request from 'supertest';
import app from '../../server';

describe('Items API', () => {
  describe('GET /api/items/:itemCode', () => {
    it('should return item details for valid item code', async () => {
      const response = await request(app).get('/api/items/AC10SIL');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('item_code', 'AC10SIL');
      expect(response.body).toHaveProperty('sku');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('total_ws_price');
      expect(response.body).toHaveProperty('category');
      expect(response.body).toHaveProperty('destination');
      expect(response.body).toHaveProperty('image_url');
      
      // image_url can be null or a string
      if (response.body.image_url !== null) {
        expect(typeof response.body.image_url).toBe('string');
      }
    });

    it('should return 404 for non-existent item', async () => {
      const response = await request(app).get('/api/items/DOESNOTEXIST999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});