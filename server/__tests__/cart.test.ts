import request from 'supertest';
import app from '../server';
import pool from '../db/connection';

describe('Cart API', () => {
  beforeEach(async () => {
    await pool.query(`DELETE FROM user_cart WHERE user_id = 1`);
  });

  describe('GET /api/cart', () => {
    it('should return empty array when cart is empty', async () => {
      const response = await request(app).get('/api/cart');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return cart items', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_email, user_name, item_code, quantity, unit_price)
         VALUES (1, 'test@example.com', 'TestUser', 'AC10SIL', 2, 50.00)`
      );

      const response = await request(app).get('/api/cart');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('item_code', 'AC10SIL');
      expect(response.body[0]).toHaveProperty('quantity', 2);
      expect(response.body[0]).toHaveProperty('unit_price', '50.00');
    });

    it('should return items ordered by added_at ascending', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_email, user_name, item_code, quantity, unit_price, added_at)
         VALUES
         (1, 'test@example.com', 'TestUser', 'ABC6', 1, 25.00, NOW() - INTERVAL '1 minute'),
         (1, 'test@example.com', 'TestUser', 'AC10SIL', 2, 50.00, NOW())`
      );

      const response = await request(app).get('/api/cart');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].item_code).toBe('ABC6');
      expect(response.body[1].item_code).toBe('AC10SIL');
    });
  });

  describe('POST /api/cart', () => {
    it('should add an item to the cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({ item_code: 'AC10SIL', quantity: 1, unit_price: 50.00 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('item_code', 'AC10SIL');
      expect(response.body).toHaveProperty('quantity', 1);
    });

    it('should persist the item to the database', async () => {
      await request(app)
        .post('/api/cart')
        .send({ item_code: 'AC10SIL', quantity: 1, unit_price: 50.00 });

      const result = await pool.query(
        `SELECT * FROM user_cart WHERE user_id = 1 AND item_code = 'AC10SIL'`
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].quantity).toBe(1);
    });

    it('should update quantity and price if item already exists', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_email, user_name, item_code, quantity, unit_price)
         VALUES (1, 'test@example.com', 'TestUser', 'AC10SIL', 1, 50.00)`
      );

      const response = await request(app)
        .post('/api/cart')
        .send({ item_code: 'AC10SIL', quantity: 5, unit_price: 55.00 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quantity', 5);

      const result = await pool.query(
        `SELECT * FROM user_cart WHERE user_id = 1 AND item_code = 'AC10SIL'`
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].quantity).toBe(5);
      expect(parseFloat(result.rows[0].unit_price)).toBe(55.00);
    });

    it('should reject empty item_code', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({ item_code: '', quantity: 1, unit_price: 50.00 });

      expect(response.status).toBe(400);
    });

    it('should reject quantity less than 1', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({ item_code: 'AC10SIL', quantity: 0, unit_price: 50.00 });

      expect(response.status).toBe(400);
    });

    it('should reject negative unit_price', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({ item_code: 'AC10SIL', quantity: 1, unit_price: -10.00 });

      expect(response.status).toBe(400);
    });

    it('should reject missing unit_price', async () => {
      const response = await request(app)
        .post('/api/cart')
        .send({ item_code: 'AC10SIL', quantity: 1 });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/cart/:item_code', () => {
    it('should remove a single item', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_email, user_name, item_code, quantity, unit_price)
         VALUES
         (1, 'test@example.com', 'TestUser', 'AC10SIL', 2, 50.00),
         (1, 'test@example.com', 'TestUser', 'ABC6', 1, 25.00)`
      );

      const response = await request(app).delete('/api/cart/AC10SIL');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      const remaining = await pool.query(
        `SELECT * FROM user_cart WHERE user_id = 1`
      );
      expect(remaining.rows.length).toBe(1);
      expect(remaining.rows[0].item_code).toBe('ABC6');
    });

    it('should return 200 when deleting an item that does not exist', async () => {
      const response = await request(app).delete('/api/cart/DOESNOTEXIST');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('DELETE /api/cart', () => {
    it('should clear the entire cart', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_email, user_name, item_code, quantity, unit_price)
         VALUES
         (1, 'test@example.com', 'TestUser', 'AC10SIL', 2, 50.00),
         (1, 'test@example.com', 'TestUser', 'ABC6', 1, 25.00)`
      );

      const response = await request(app).delete('/api/cart');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      const remaining = await pool.query(
        `SELECT * FROM user_cart WHERE user_id = 1`
      );
      expect(remaining.rows.length).toBe(0);
    });

    it('should return 200 when clearing an already empty cart', async () => {
      const response = await request(app).delete('/api/cart');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});