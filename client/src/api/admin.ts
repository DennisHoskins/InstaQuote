import { QueryClient } from '@tanstack/react-query';
import { apiClient } from './apiClient';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export const api = {
  getDashboard: async () => {
    return apiClient.get('/admin/dashboard');
  },

  getSyncLog: async (page: number, limit: number, type?: 'access' | 'dropbox' | 'dropbox_crawl' | 'dropbox_links' | 'sku_mapping', search?: string, status?: 'success' | 'failed', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiClient.get(`/admin/sync-log?${params}`);
  },

  getSyncStats: async (days: number = 30) => {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    return apiClient.get(`/admin/sync-stats?${params}`);
  },

  getSyncStatus: async (syncType: string) => {
    return apiClient.get(`/admin/sync/status/${syncType}`);
  },

  getMetalsPrices: async (days: number = 30) => {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    return apiClient.get(`/admin/metals-prices?${params}`);
  },

  getMetals: async (page: number, limit: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiClient.get(`/admin/metals?${params}`);
  },

  getItemsStats: async () => {
    return apiClient.get('/admin/items-stats');
  },

  getItems: async (page: number, limit: number, search?: string, hasImage?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (hasImage !== undefined) params.append('has_image', hasImage.toString());
    return apiClient.get(`/admin/items?${params}`);
  },

  getImagesStats: async () => {
    return apiClient.get('/admin/images-stats');
  },

  getFileTypes: async () => {
    return apiClient.get('/admin/images/file-types');
  },

  getImages: async (page: number, limit: number, search?: string, matched?: boolean, fileType?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (matched !== undefined) params.append('matched', matched.toString());
    if (fileType) params.append('file_type', fileType);
    return apiClient.get(`/admin/images?${params}`);
  },

  getImageDetail: async (id: number) => {
    return apiClient.get(`/admin/images/${id}`);
  },

  getSkuImagesStats: async () => {
    return apiClient.get('/admin/sku-images/stats');
  },

  getSkuImages: async (page: number, limit: number, sku?: string, matchType?: string, isPrimary?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (sku) params.append('sku', sku);
    if (matchType) params.append('match_type', matchType);
    if (isPrimary !== undefined) params.append('is_primary', isPrimary.toString());
    return apiClient.get(`/admin/sku-images?${params}`);
  },

  getSkuImage: async (id: number) => {
    return apiClient.get(`/admin/sku-images/${id}`);
  },

  getMissingLinksCount: async () => {
    return apiClient.get('/admin/sync/missing-links-count');
  },

  getSkus: async (page: number, limit: number, search?: string, hasImage?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (hasImage !== undefined) params.append('has_image', hasImage.toString());
    return apiClient.get(`/admin/skus?${params}`);
  },

  getSkuDetail: async (sku: string) => {
    return apiClient.get(`/admin/skus/${sku}`);
  },

  // Sync operations
  triggerDropboxCrawl: async (userName: string, dropboxToken: string) => {
    return apiClient.post('/admin/sync/dropbox-crawl', { user_name: userName, dropbox_token: dropboxToken });
  },

  triggerCreateLinks: async (userName: string, dropboxToken: string) => {
    return apiClient.post('/admin/sync/create-links', { user_name: userName, dropbox_token: dropboxToken });
  },

  triggerGenerateMappings: async (userName: string) => {
    return apiClient.post('/admin/sync/generate-mappings', { user_name: userName });
  },

  deleteAllSkuImageMappings: async () => {
    return apiClient.delete('/admin/sync/mappings/all');
  },

  deleteSkuImageMapping: async (id: number) => {
    return apiClient.delete(`/admin/sync/mapping/${id}`);
  },

  markSyncAsFailed: async (id: number, errorMessage: string) => {
    return apiClient.patch(`/admin/sync/${id}/mark-failed`, { error_message: errorMessage });
  },

  // Admin Orders
  getOrders: async (page: number, limit: number, search?: string, status?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return apiClient.get(`/admin/orders?${params}`);
  },

  getOrder: async (id: number) => {
    return apiClient.get(`/admin/orders/${id}`);
  },

  updateOrder: async (id: number, updates: { status?: string; notes?: string }) => {
    return apiClient.patch(`/admin/orders/${id}`, updates);
  },

  deleteOrder: async (id: number) => {
    return apiClient.delete(`/admin/orders/${id}`);
  },
};