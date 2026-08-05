import { api } from '@/lib/api';
import type { PaginatedResponse, SubscriptionDto } from './types';

export const subscriptionsService = {
  list(page = 1, limit = 20) {
    return api.get<PaginatedResponse<SubscriptionDto>>('/subscriptions', { params: { page, limit } });
  },

  getById(id: string) {
    return api.get<SubscriptionDto>(`/subscriptions/${id}`);
  },

  pause(id: string) {
    return api.post(`/subscriptions/${id}/pause`);
  },

  resume(id: string) {
    return api.post(`/subscriptions/${id}/resume`);
  },

  cancel(id: string, reason: string) {
    return api.post(`/subscriptions/${id}/cancel`, { reason });
  },

  reconcile(id: string) {
    return api.post(`/subscriptions/${id}/reconcile`);
  },
};
