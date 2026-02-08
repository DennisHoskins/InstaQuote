import request from 'supertest';
import app from '../../server';
import pool from '../../db/connection';

// Helper to generate unique order number
const uniqueOrderNumber = () => `ORD-TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

describe('Admin Orders API', () => {
  describe('GET /api/admin/orders', () => {
    it('should return paginated orders list', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .query({ page: 1, limit: 25 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should search orders by order number, name, or email', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .query({ page: 1, limit: 25, search: 'TestUser' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
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
        .get('/api/admin/orders')
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
  });

  describe('GET /api/admin/orders/:id', () => {
    it('should return order detail with items', async () => {
      // Create a test order
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, notes, updated_by)
         VALUES (1, 'TestUser', 'TestUser@example.com', $1, 'pending', 100, 'Admin test order', 1)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      await pool.query(
        `INSERT INTO order_items (order_id, item_code, sku, description, quantity, unit_price, line_total)
         VALUES ($1, 'AC10SIL', 'ACSIL', 'SS NAXO DIDRACHM (SILENO) W/14KY BAIL', 2, 50, 100)`,
        [orderId]
      );

      const response = await request(app).get(`/api/admin/orders/${orderId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('order_number');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0]).toHaveProperty('item_code', 'AC10SIL');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app).get('/api/admin/orders/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/admin/orders/:id', () => {
    it('should update order status', async () => {
      // Create test order
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'TestUser@example.com', $1, 'pending', 50, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app)
        .patch(`/api/admin/orders/${orderId}`)
        .send({ status: 'processing' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'processing');
      expect(response.body).toHaveProperty('updated_at');
    });

    it('should update order notes', async () => {
      // Create test order
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'TestUser@example.com', $1, 'pending', 50, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app)
        .patch(`/api/admin/orders/${orderId}`)
        .send({ notes: 'Updated notes from admin' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('notes', 'Updated notes from admin');
    });

    it('should update both status and notes', async () => {
      // Create test order
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'TestUser@example.com', $1, 'pending', 50, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app)
        .patch(`/api/admin/orders/${orderId}`)
        .send({ status: 'completed', notes: 'Order shipped' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'completed');
      expect(response.body).toHaveProperty('notes', 'Order shipped');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app)
        .patch('/api/admin/orders/999999')
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate status values', async () => {
      // Create test order
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'TestUser@example.com', $1, 'pending', 50, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app)
        .patch(`/api/admin/orders/${orderId}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/orders/:id', () => {
    it('should soft delete an order', async () => {
      // Create test order
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, user_name, user_email, order_number, status, total_amount, updated_by)
         VALUES (1, 'TestUser', 'TestUser@example.com', $1, 'pending', 50, 1)
         RETURNING id`,
        [uniqueOrderNumber()]
      );
      const orderId = orderResult.rows[0].id;

      const response = await request(app).delete(`/api/admin/orders/${orderId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deleted', true);
      expect(response.body).toHaveProperty('id', orderId);

      // Verify it's soft deleted
      const checkResult = await pool.query(
        'SELECT deleted_at FROM orders WHERE id = $1',
        [orderId]
      );
      expect(checkResult.rows[0].deleted_at).not.toBeNull();
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app).delete('/api/admin/orders/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
});