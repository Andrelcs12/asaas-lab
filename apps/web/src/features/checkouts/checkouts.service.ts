import { api } from '@/lib/api';
import type { CheckoutDto, PaginatedResponse } from './types';

export const checkoutsService = {
  list(page = 1, limit = 20) {
    return api.get<PaginatedResponse<CheckoutDto>>('/checkouts', { params: { page, limit } });
  },

  getById(id: string) {
    return api.get<CheckoutDto>(`/checkouts/${id}`);
  },

  reconcile(id: string) {
    return api.post(`/checkouts/${id}/reconcile`);
  },
};
