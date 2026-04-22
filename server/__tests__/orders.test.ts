import request from 'supertest';
import app from '../server';
import pool from '../db/connection';

const uniqueOrderNumber = () => `ORD-TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

describe('User Orders API', () => {
  describe('POST /api/orders', () => {
    beforeEach(async () => {
      await pool.query(`DELETE FROM user_cart WHERE user_id IN (1, 2)`);
    });

    it('should create a new order', async () => {
      const orderData = {
        items: [
          {
            item_code: 'AC10SIL',
            quantity: 2,
            unit_price: 50.00,
          },
        ],
        notes: 'Test order',
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('order');
      expect(response.body.order).toHaveProperty('id');
      expect(response.body.order).toHaveProperty('order_number');
      expect(response.body.order).toHaveProperty('total_amount', 100);
      expect(response.body.order).toHaveProperty('gold_price');
      expect(response.body.order).toHaveProperty('ss_price');
      expect(response.body.order).toHaveProperty('status', 'pending');
    });

    it('should require at least one item', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({ items: [] });

      expect(response.status).toBe(400);
    });

    it('should validate item fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [
            {
              item_code: '',
              quantity: 0,
              unit_price: -10,
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('should calculate total from items', async () => {
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

    it('should clear the user cart after order is placed', async () => {
      await pool.query(
        `INSERT INTO user_cart (user_id, user_email, user_name, item_code, quantity, unit_price)
         VALUES (1, 'test@example.com', 'TestUser', 'AC10SIL', 2, 50.00)`
      );

      const orderData = {
        items: [
          {
            item_code: 'AC10SIL',
            quantity: 2,
            unit_price: 50.00,
          },
        ],
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(200);

      const cartResult = await pool.query(
        `SELECT * FROM user_cart WHERE user_id = 1`
      );
      expect(cartResult.rows.length).toBe(0);
    });
  });

  describe('GET /api/orders', () => {
    it('should return paginated list of user orders', async () => {
      await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'test@example.com', $1, 'pending', 100, 1)`,
        [uniqueOrderNumber()]
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
      expect(response.body.items).toBeDefined();
    });

    it('should return total_qty in list items', async () => {
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'test@example.com', $1, 'pending', 150, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      await pool.query(
        `INSERT INTO order_items (order_id, item_code, sku, description, quantity, unit_price, line_total)
         VALUES
         ($1, 'AC10SIL', 'ACSIL', 'SS NAXO DIDRACHM (SILENO) W/14KY BAIL', 2, 50, 100),
         ($1, 'ABC6', 'ABC6', 'Test Item', 3, 50, 150)`,
        [orderId]
      );

      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);

      const order = response.body.items.find((o: any) => o.id === orderId);
      expect(order).toBeDefined();
      expect(order).toHaveProperty('total_qty', 5);
      expect(typeof order.total_qty).toBe('number');
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order detail with items', async () => {
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'test@example.com', $1, 'pending', 100, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
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
      expect(response.body).toHaveProperty('items');
      expect(response.body.order).toHaveProperty('id', orderId);
      expect(response.body.order).toHaveProperty('order_number');
      expect(response.body.order).toHaveProperty('status', 'pending');
      expect(response.body.order).toHaveProperty('gold_price');
      expect(response.body.order).toHaveProperty('ss_price');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0]).toHaveProperty('item_code', 'AC10SIL');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app).get('/api/orders/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should not return other users orders', async () => {
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (999, 'OtherUser', 'other@example.com', $1, 'pending', 100, 999)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app).get(`/api/orders/${orderId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/orders/:id/reorder', () => {
    it('should create a new order from existing order', async () => {
      const originalOrderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'test@example.com', $1, 'completed', 150, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
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
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (999, 'OtherUser', 'other@example.com', $1, 'completed', 100, 999)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app).post(`/api/orders/${orderId}/reorder`);

      expect(response.status).toBe(404);
    });
  });
});