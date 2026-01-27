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
  getCatalogItems: async (page: number, limit: number, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    const response = await fetch(`${API_BASE_URL}/catalog/items?${params}`);
    if (!response.ok) throw new Error('Failed to fetch catalog items');
    return response.json();
  },

  getDestinations: async (search?: string) => {
    const params = new URLSearchParams({
      ...(search && { search }),
    });
    const response = await fetch(`${API_BASE_URL}/destinations?${params}`);
    if (!response.ok) throw new Error('Failed to fetch destinations');
    return response.json();
  },

  getDestinationItems: async (destination: string, page: number, limit: number, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    const response = await fetch(`${API_BASE_URL}/destinations/${destination}/items?${params}`);
    if (!response.ok) throw new Error('Failed to fetch destination items');
    return response.json();
  },

  searchAllItems: async (search: string, page: number, limit: number) => {
    const params = new URLSearchParams({
      search,
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    if (!response.ok) throw new Error('Failed to search items');
    return response.json();
  },

  getItem: async (itemCode: string) => {
    const response = await fetch(`${API_BASE_URL}/items/${itemCode}`);
    if (!response.ok) throw new Error('Failed to fetch item');
    return response.json();
  },  
};