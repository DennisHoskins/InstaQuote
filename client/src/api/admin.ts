import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  getDashboard: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/admin/sync-log?${params}`);
    if (!response.ok) throw new Error('Failed to fetch sync log');
    return response.json();
  },

  getSyncStats: async (days: number = 30) => {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    const response = await fetch(`${API_BASE_URL}/admin/sync-stats?${params}`);
    if (!response.ok) throw new Error('Failed to fetch sync stats');
    return response.json();
  },

  getSyncStatus: async (syncType: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/sync/status/${syncType}`);
    if (!response.ok) throw new Error('Failed to fetch sync status');
    return response.json();
  },

  getMetalsPrices: async (days: number = 30) => {
    const params = new URLSearchParams({
      days: days.toString(),
    });
    const response = await fetch(`${API_BASE_URL}/admin/metals-prices?${params}`);
    if (!response.ok) throw new Error('Failed to fetch metals prices');
    return response.json();
  },

  getMetals: async (page: number, limit: number, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const response = await fetch(`${API_BASE_URL}/admin/metals?${params}`);
    if (!response.ok) throw new Error('Failed to fetch metals');
    return response.json();
  },

  getItemsStats: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/items-stats`);
    if (!response.ok) throw new Error('Failed to fetch items stats');
    return response.json();
  },

  getItems: async (page: number, limit: number, search?: string, hasImage?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (hasImage !== undefined) params.append('has_image', hasImage.toString());
    const response = await fetch(`${API_BASE_URL}/admin/items?${params}`);
    if (!response.ok) throw new Error('Failed to fetch items');
    return response.json();
  },

  getImagesStats: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/images-stats`);
    if (!response.ok) throw new Error('Failed to fetch images stats');
    return response.json();
  },

  getFileTypes: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/images/file-types`);
    if (!response.ok) throw new Error('Failed to fetch file types');
    return response.json();
  },

  getImages: async (page: number, limit: number, search?: string, matched?: boolean, fileType?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (matched !== undefined) params.append('matched', matched.toString());
    if (fileType) params.append('file_type', fileType);
    const response = await fetch(`${API_BASE_URL}/admin/images?${params}`);
    if (!response.ok) throw new Error('Failed to fetch images');
    return response.json();
  },

  getImageDetail: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/admin/images/${id}`);
    if (!response.ok) throw new Error('Failed to fetch image details');
    return response.json();
  },  

  getSkuImagesStats: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/sku-images/stats`);
    if (!response.ok) throw new Error('Failed to fetch SKU images stats');
    return response.json();
  },

  getSkuImages: async (page: number, limit: number, sku?: string, matchType?: string, isPrimary?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (sku) params.append('sku', sku);
    if (matchType) params.append('match_type', matchType);
    if (isPrimary !== undefined) params.append('is_primary', isPrimary.toString());
    const response = await fetch(`${API_BASE_URL}/admin/sku-images?${params}`);
    if (!response.ok) throw new Error('Failed to fetch SKU images');
    return response.json();
  },

  getSkuImage: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/admin/sku-images/${id}`);
    if (!response.ok) throw new Error('Failed to fetch SKU image mapping');
    return response.json();
  },  

  getMissingLinksCount: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/sync/missing-links-count`);
    if (!response.ok) throw new Error('Failed to fetch missing links count');
    return response.json();
  },

  getSkus: async (page: number, limit: number, search?: string, hasImage?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (hasImage !== undefined) params.append('has_image', hasImage.toString());
    const response = await fetch(`${API_BASE_URL}/admin/skus?${params}`);
    if (!response.ok) throw new Error('Failed to fetch SKUs');
    return response.json();
  },

  getSkuDetail: async (sku: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/skus/${sku}`);
    if (!response.ok) throw new Error('Failed to fetch SKU details');
    return response.json();
  },

  // Sync operations
  triggerDropboxCrawl: async (userName: string, dropboxToken: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/sync/dropbox-crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName, dropbox_token: dropboxToken }),
    });
    if (!response.ok) throw new Error('Failed to trigger Dropbox crawl');
    return response.json();
  },

  triggerCreateLinks: async (userName: string, dropboxToken: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/sync/create-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName, dropbox_token: dropboxToken }),
    });
    if (!response.ok) throw new Error('Failed to trigger link creation');
    return response.json();
  },

  triggerGenerateMappings: async (userName: string) => {
    const response = await fetch(`${API_BASE_URL}/admin/sync/generate-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: userName }),
    });
    if (!response.ok) throw new Error('Failed to trigger mapping generation');
    return response.json();
  },

  deleteSkuImageMapping: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/admin/sync/mapping/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete mapping');
    return response.json();
  },
};