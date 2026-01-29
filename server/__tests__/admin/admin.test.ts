import request from 'supertest';
import app from '../../server';

describe('Admin Dashboard API', () => {
  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard data', async () => {
      const response = await request(app).get('/api/admin/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('syncStats');
      expect(response.body).toHaveProperty('itemsStats');
      expect(response.body).toHaveProperty('ordersData');
      expect(response.body).toHaveProperty('skuStats');
      expect(response.body).toHaveProperty('imagesStats');
      expect(response.body).toHaveProperty('imageMatchStats');
      expect(response.body).toHaveProperty('metalsData');
    });

    it('should have correct syncStats structure', async () => {
      const response = await request(app).get('/api/admin/dashboard');

      expect(response.status).toBe(200);
      
      // Check all sync types exist
      expect(response.body.syncStats).toHaveProperty('access');
      expect(response.body.syncStats).toHaveProperty('dropbox_crawl');
      expect(response.body.syncStats).toHaveProperty('dropbox_links');
      expect(response.body.syncStats).toHaveProperty('sku_mapping');

      // Check structure of each sync type
      const syncTypes = ['access', 'dropbox_crawl', 'dropbox_links', 'sku_mapping'];
      
      syncTypes.forEach(syncType => {
        const stats = response.body.syncStats[syncType];
        expect(stats).toHaveProperty('successRate');
        expect(stats).toHaveProperty('averageSyncTime');
        expect(stats).toHaveProperty('totalRuns');
        expect(typeof stats.successRate).toBe('number');
        expect(typeof stats.averageSyncTime).toBe('number');
        expect(typeof stats.totalRuns).toBe('number');
        
        // lastSync can be null if no syncs have been run
        if (stats.lastSync !== null) {
          expect(stats.lastSync).toHaveProperty('itemsCount');
          expect(stats.lastSync).toHaveProperty('duration');
          expect(stats.lastSync).toHaveProperty('status');
          expect(stats.lastSync).toHaveProperty('timestamp');
        }
      });
    });

    it('should have correct skuStats structure', async () => {
      const response = await request(app).get('/api/admin/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.skuStats).toHaveProperty('totalSkus');
      expect(response.body.skuStats).toHaveProperty('skusWithImages');
      expect(response.body.skuStats).toHaveProperty('skusWithoutImages');
      expect(response.body.skuStats).toHaveProperty('coveragePercent');
      expect(typeof response.body.skuStats.totalSkus).toBe('number');
      expect(typeof response.body.skuStats.skusWithImages).toBe('number');
      expect(typeof response.body.skuStats.skusWithoutImages).toBe('number');
      expect(typeof response.body.skuStats.coveragePercent).toBe('number');
    });

    it('should include ordersData in dashboard response', async () => {
      const response = await request(app).get('/api/admin/dashboard');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ordersData');
      expect(response.body.ordersData).toHaveProperty('totalOrders');
      expect(response.body.ordersData).toHaveProperty('totalRevenue');
      expect(typeof response.body.ordersData.totalOrders).toBe('number');
      expect(typeof response.body.ordersData.totalRevenue).toBe('number');
      expect(response.body.ordersData.totalOrders).toBeGreaterThanOrEqual(0);
      expect(response.body.ordersData.totalRevenue).toBeGreaterThanOrEqual(0);
    });

    it('should have correct imagesStats structure', async () => {
      const response = await request(app).get('/api/admin/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.imagesStats).toHaveProperty('totalImages');
      expect(response.body.imagesStats).toHaveProperty('webImages');
      expect(response.body.imagesStats).toHaveProperty('linkedWebImages');
      expect(response.body.imagesStats).toHaveProperty('webImagesPercent');
      expect(response.body.imagesStats).toHaveProperty('fileTypeBreakdown');
      expect(typeof response.body.imagesStats.totalImages).toBe('number');
      expect(typeof response.body.imagesStats.webImages).toBe('number');
      expect(typeof response.body.imagesStats.linkedWebImages).toBe('number');
      expect(typeof response.body.imagesStats.webImagesPercent).toBe('number');
      expect(Array.isArray(response.body.imagesStats.fileTypeBreakdown)).toBe(true);
      
      if (response.body.imagesStats.fileTypeBreakdown.length > 0) {
        const fileType = response.body.imagesStats.fileTypeBreakdown[0];
        expect(fileType).toHaveProperty('type');
        expect(fileType).toHaveProperty('count');
        expect(fileType).toHaveProperty('percent');
        expect(typeof fileType.type).toBe('string');
        expect(typeof fileType.count).toBe('number');
        expect(typeof fileType.percent).toBe('number');
      }
    });

    it('should have correct imageMatchStats structure', async () => {
      const response = await request(app).get('/api/admin/dashboard');

      expect(response.status).toBe(200);
      expect(response.body.imageMatchStats).toHaveProperty('totalMappings');
      expect(response.body.imageMatchStats).toHaveProperty('skusWithImages');
      expect(typeof response.body.imageMatchStats.totalMappings).toBe('number');
      expect(typeof response.body.imageMatchStats.skusWithImages).toBe('number');
    });
  });
});