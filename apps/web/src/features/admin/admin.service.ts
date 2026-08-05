import { api } from '@/lib/api';
import type { AuditLogDto, DashboardStats, PaginatedResponse, SettingsInfo, WebhookEventDto } from './types';

export const adminService = {
  dashboard() {
    return api.get<DashboardStats>('/admin/dashboard');
  },

  settings() {
    return api.get<SettingsInfo>('/admin/settings');
  },

  sandbox() {
    return api.get('/admin/sandbox');
  },

  audit(page = 1, limit = 20) {
    return api.get<PaginatedResponse<AuditLogDto>>('/admin/audit', { params: { page, limit } });
  },

  listWebhooks(page = 1, limit = 20) {
    return api.get<PaginatedResponse<WebhookEventDto>>('/admin/webhooks', { params: { page, limit } });
  },

  getWebhook(id: string) {
    return api.get<WebhookEventDto>(`/admin/webhooks/${id}`);
  },

  reprocessWebhook(id: string) {
    return api.post(`/admin/webhooks/${id}/reprocess`);
  },

  runReconciliation() {
    return api.post('/admin/reconciliation/run');
  },
};
