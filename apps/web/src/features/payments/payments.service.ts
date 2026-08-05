import { api } from '@/lib/api';
import type { CheckoutCreatedResponse, PaginatedResponse, PaymentDto } from './types';

export const paymentsService = {
  list(params?: { page?: number; limit?: number; status?: string; customerId?: string }) {
    return api.get<PaginatedResponse<PaymentDto>>('/payments', { params });
  },

  getById(id: string) {
    return api.get<PaymentDto>(`/payments/${id}`);
  },

  reconcile(id: string) {
    return api.post(`/payments/${id}/reconcile`);
  },

  refund(id: string, value?: number) {
    return api.post(`/payments/${id}/refund`, value !== undefined ? { value } : {});
  },
};

export type { CheckoutCreatedResponse };
