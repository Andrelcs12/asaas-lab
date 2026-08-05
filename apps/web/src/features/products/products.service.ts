import { api } from '@/lib/api';
import type { PaginatedResponse, ProductDto } from './types';

export const productsService = {
  list(params?: { page?: number; limit?: number; type?: string; isActive?: boolean }) {
    return api.get<PaginatedResponse<ProductDto>>('/products', { params });
  },

  getById(id: string) {
    return api.get<ProductDto>(`/products/${id}`);
  },

  create(body: Record<string, unknown>) {
    return api.post<ProductDto>('/products', body);
  },

  update(id: string, body: Record<string, unknown>) {
    return api.patch<ProductDto>(`/products/${id}`, body);
  },
};
