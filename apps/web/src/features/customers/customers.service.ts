import { api } from '@/lib/api';
import type { CustomerDto, PaginatedResponse } from './types';

export const customersService = {
  list(page = 1, limit = 20) {
    return api.get<PaginatedResponse<CustomerDto>>('/customers', { params: { page, limit } });
  },

  getById(id: string) {
    return api.get<CustomerDto>(`/customers/${id}`);
  },

  create(body: Record<string, string>) {
    return api.post<CustomerDto>('/customers', body);
  },

  sync(id: string) {
    return api.post<CustomerDto>(`/customers/${id}/sync`);
  },
};
