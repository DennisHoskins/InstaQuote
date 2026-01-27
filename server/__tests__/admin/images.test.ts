import request from 'supertest';
import app from '../../server.js';
import { expect } from '@jest/globals';
import { expectPaginatedResponse } from '../utils.js';

describe('Admin Images API', () => {
describe('GET /api/admin/images/file-types', () => {
    it('should return list of unique file types', async () => {
      const response = await request(app)
        .get('/api/admin/images/file-types');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        expect(typeof response.body[0]).toBe('string');
        // Should be sorted
        const sorted = [...response.body].sort();
        expect(response.body).toEqual(sorted);
      }
    });
  });

  describe('GET /api/admin/images with file_type filter', () => {
    it('should filter images by file type', async () => {
      const response = await request(app)
        .get('/api/admin/images')
        .query({ page: 1, limit: 5, file_type: '.psd' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allMatchFilter = response.body.items.every((img: any) => img.file_extension === '.psd');
        expect(allMatchFilter).toBe(true);
      }
    });
  });

  describe('GET /api/admin/images', () => {
    it('should return paginated images list', async () => {
      const response = await request(app)
        .get('/api/admin/images')
        .query({ page: 1, limit: 25 });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const image = response.body.items[0];
        expect(image).toHaveProperty('id');
        expect(image).toHaveProperty('file_name');
        expect(image).toHaveProperty('file_name_no_ext');
        expect(image).toHaveProperty('file_path');
        expect(image).toHaveProperty('file_extension');
        expect(image).toHaveProperty('is_matched');
        expect(image).toHaveProperty('matched_item_code');
      }
    });

    it('should search images by filename', async () => {
      const response = await request(app)
        .get('/api/admin/images')
        .query({ page: 1, limit: 25, search: 'AC10' });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const hasSearch = response.body.items.every((image: any) =>
          image.file_name.toLowerCase().includes('ac10') ||
          image.file_name_no_ext.toLowerCase().includes('ac10')
        );
        expect(hasSearch).toBe(true);
      }
    });

    it('should filter matched images', async () => {
      const response = await request(app)
        .get('/api/admin/images')
        .query({ page: 1, limit: 25, matched: true });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allMatched = response.body.items.every((image: any) => image.is_matched === true);
        expect(allMatched).toBe(true);
      }
    });

    it('should filter unmatched images', async () => {
      const response = await request(app)
        .get('/api/admin/images')
        .query({ page: 1, limit: 25, matched: false });

      expectPaginatedResponse(response);
      
      if (response.body.items.length > 0) {
        const allUnmatched = response.body.items.every((image: any) => image.is_matched === false);
        expect(allUnmatched).toBe(true);
      }
    });
  });
});