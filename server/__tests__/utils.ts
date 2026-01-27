import { expect } from '@jest/globals';

export const expectPaginatedResponse = (response: any) => {
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('items');
  expect(response.body).toHaveProperty('total');
  expect(response.body).toHaveProperty('page');
  expect(response.body).toHaveProperty('limit');
  expect(Array.isArray(response.body.items)).toBe(true);
};