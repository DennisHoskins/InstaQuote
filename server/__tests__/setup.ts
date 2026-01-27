import pool from '../db/connection.js';

afterAll(async () => {
  await pool.end();
});