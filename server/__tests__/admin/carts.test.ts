import request from 'supertest';
import app from '../../server';
import pool from '../../db/connection';

describe('Admin Carts API', () => {
  beforeEach(async () => {
    await pool.query(`DELETE FROM user_cart WHERE user_id IN (1, 2, 99)`);
  });

  describe('GET /api/admin/carts', () => {
    it('should return empty list when no carts exist', async () => {
      const response = await request(app)
        .get('/api/admin/carts')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should return paginated cart list grouped by user', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_name, user_email, item_code, quantity, unit_price)
         VALUES
         (1, 'Test User', 'test@example.com', 'TEST-CART-1', 2, 50.00),
         (1, 'Test User', 'test@example.com', 'TEST-CART-2', 1, 25.00),
         (2, 'Other User', 'other@example.com', 'TEST-CART-1', 3, 50.00)`
      );

      const response = await request(app)
        .get('/api/admin/carts')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(2);

      const user1Cart = response.body.items.find((c: any) => c.user_id === 1);
      expect(user1Cart).toBeDefined();
      expect(user1Cart.item_count).toBe(2);
      expect(user1Cart.total_qty).toBe(3);
      expect(user1Cart.total_value).toBeCloseTo(125.00);
    });

    it('should search by email', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_name, user_email, item_code, quantity, unit_price)
         VALUES
         (1, 'Test User', 'test@example.com', 'TEST-CART-1', 1, 50.00),
         (2, 'Other User', 'other@example.com', 'TEST-CART-2', 1, 25.00)`
      );

      const response = await request(app)
        .get('/api/admin/carts')
        .query({ search: 'other' });

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].user_email).toBe('other@example.com');
    });

    it('should return correct structure per item', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_name, user_email, item_code, quantity, unit_price)
         VALUES (1, 'Test User', 'test@example.com', 'TEST-CART-1', 2, 50.00)`
      );

      const response = await request(app)
        .get('/api/admin/carts')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);
      const cart = response.body.items[0];
      expect(cart).toHaveProperty('user_id');
      expect(cart).toHaveProperty('user_name');
      expect(cart).toHaveProperty('user_email');
      expect(cart).toHaveProperty('item_count');
      expect(cart).toHaveProperty('total_qty');
      expect(cart).toHaveProperty('total_value');
      expect(cart).toHaveProperty('first_added');
      expect(cart).toHaveProperty('last_updated');
    });
  });

  describe('GET /api/admin/carts/:user_id', () => {
    it('should return 404 for user with no cart', async () => {
      const response = await request(app).get('/api/admin/carts/999999');

      expect(response.status).toBe(404);
    });

    it('should return cart detail with items', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_name, user_email, item_code, quantity, unit_price)
         VALUES (99, 'Test User', 'test@example.com', 'TEST-CART-1', 2, 50.00)`
      );

      const response = await request(app).get('/api/admin/carts/99');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_id', 99);
      expect(response.body).toHaveProperty('user_email', 'test@example.com');
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(1);

      const item = response.body.items[0];
      expect(item).toHaveProperty('item_code', 'TEST-CART-1');
      expect(item).toHaveProperty('quantity', 2);
      expect(item).toHaveProperty('unit_price');
      expect(item).toHaveProperty('added_at');
    });
  });
});