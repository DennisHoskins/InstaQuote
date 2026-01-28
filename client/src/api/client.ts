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
  getCatalogItems: async (page: number, limit: number, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    return apiClient.get(`/catalog/items?${params}`);
  },

  getDestinations: async (search?: string) => {
    const params = new URLSearchParams({
      ...(search && { search }),
    });
    const query = params.toString();
    return apiClient.get(`/destinations${query ? `?${query}` : ''}`);
  },

  getDestinationItems: async (destination: string, page: number, limit: number, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    return apiClient.get(`/destinations/${destination}/items?${params}`);
  },

  searchAllItems: async (search: string, page: number, limit: number) => {
    const params = new URLSearchParams({
      search,
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiClient.get(`/search?${params}`);
  },

  getItem: async (itemCode: string) => {
    return apiClient.get(`/items/${itemCode}`);
  },  
};