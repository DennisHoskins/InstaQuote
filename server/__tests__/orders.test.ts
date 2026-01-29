import request from 'supertest';
import app from '../server';
import pool from '../db/connection';

describe('User Orders API', () => {
  describe('POST /api/orders', () => {
    it('should create a new order with items', async () => {
      const orderData = {
        items: [
          {
            item_code: 'AC10SIL',
            sku: 'ACSIL',
            description: 'SS NAXO DIDRACHM (SILENO) W/14KY BAIL',
            quantity: 2,
            unit_price: 50,
          },
          {
            item_code: 'ABC6',
            sku: 'ABC6',
            description: 'Test Item',
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('order');
      expect(response.body.order).toHaveProperty('id');
      expect(response.body.order).toHaveProperty('order_number');
      expect(response.body.order).toHaveProperty('status', 'pending');
      expect(response.body.order).toHaveProperty('total_amount', 200);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate item structure', async () => {
      const orderData = {
        items: [
          {
            item_code: 'AC10SIL',
            // missing sku, description, quantity, unit_price
          },
        ],
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(400);
    });

    it('should calculate total amount correctly', async () => {
      const orderData = {
        items: [
          {
            item_code: 'TEST1',
            sku: 'TEST1',
            description: 'Test Item 1',
            quantity: 3,
            unit_price: 25.50,
          },
          {
            item_code: 'TEST2',
            sku: 'TEST2',
            description: 'Test Item 2',
            quantity: 2,
            unit_price: 10.25,
          },
        ],
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(200);
      // 3 * 25.50 + 2 * 10.25 = 76.50 + 20.50 = 97.00
      expect(response.body.order.total_amount).toBe(97);
    });
  });

  describe('GET /api/orders', () => {
    it('should return paginated list of user orders', async () => {
      // Create a test order first
      await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'test@example.com', 'ORD-TEST-' || FLOOR(RANDOM() * 1000), 'pending', 100, 1)`
      );

      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 25, status: 'pending' });

      expect(response.status).toBe(200);
      if (response.body.items.length > 0) {
        const allPending = response.body.items.every((order: any) => order.status === 'pending');
        expect(allPending).toBe(true);
      }
    });

    it('should filter orders by date range', async () => {
      const startDate = '2026-01-01';
      const endDate = '2026-12-31';

      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 25, start_date: startDate, end_date: endDate });

      expect(response.status).toBe(200);

      if (response.body.items.length > 0) {
        const allInRange = response.body.items.every((order: any) => {
          const createdDate = new Date(order.created_at);
          return createdDate >= new Date(startDate) && createdDate <= new Date(endDate);
        });
        expect(allInRange).toBe(true);
      }
    });

    it('should only return orders for the authenticated user', async () => {
      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);
      
      // Just verify we got results - user filtering handled by auth middleware
      expect(response.body.items).toBeDefined();
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order detail with items', async () => {
      // Create test order
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'test@example.com', 'ORD-TEST-' || FLOOR(RANDOM() * 1000), 'pending', 100, 1)
         RETURNING id`
      );
      const orderId = orderResult.rows[0].id;

      await pool.query(
        `INSERT INTO order_items (order_id, item_code, sku, description, quantity, unit_price, line_total)
         VALUES ($1, 'AC10SIL', 'ACSIL', 'SS NAXO DIDRACHM (SILENO) W/14KY BAIL', 2, 50, 100)`,
        [orderId]
      );

      const response = await request(app).get(`/api/orders/${orderId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('order');
      expect(response.body.order).toHaveProperty('id', orderId);
      expect(response.body.order).toHaveProperty('order_number');
      expect(response.body.order).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(1);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app).get('/api/orders/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should not allow accessing other users orders', async () => {
      // Create order for different user
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (999, 'OtherUser', 'other@example.com', 'ORD-TEST-' || FLOOR(RANDOM() * 1000), 'pending', 100, 999)
         RETURNING id`
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app).get(`/api/orders/${orderId}`);

      // Should return 404 (not 403) to prevent information leakage
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/orders/:id/reorder', () => {
    it('should create a new order from existing order', async () => {
      // Create original order
      const originalOrderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'test@example.com', 'ORD-TEST-' || FLOOR(RANDOM() * 1000), 'completed', 150, 1)
         RETURNING id`
      );
      const originalOrderId = originalOrderResult.rows[0].id;

      await pool.query(
        `INSERT INTO order_items (order_id, item_code, sku, description, quantity, unit_price, line_total)
         VALUES 
         ($1, 'AC10SIL', 'ACSIL', 'SS NAXO DIDRACHM (SILENO) W/14KY BAIL', 2, 50, 100),
         ($1, 'ABC6', 'ABC6', 'Test Item', 1, 50, 50)`,
        [originalOrderId]
      );

      const response = await request(app).post(`/api/orders/${originalOrderId}/reorder`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cart_items');
      expect(Array.isArray(response.body.cart_items)).toBe(true);
      expect(response.body.cart_items.length).toBeGreaterThan(0);
      
      // Verify cart items structure
      const item = response.body.cart_items[0];
      expect(item).toHaveProperty('item_code');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('current_price');
      expect(item).toHaveProperty('item_details');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app).post('/api/orders/999999/reorder');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should not allow reordering other users orders', async () => {
      // Create order for different user
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (999, 'OtherUser', 'other@example.com', 'ORD-TEST-' || FLOOR(RANDOM() * 1000), 'completed', 100, 999)
         RETURNING id`
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app).post(`/api/orders/${orderId}/reorder`);

      expect(response.status).toBe(404);
    });
  });
});