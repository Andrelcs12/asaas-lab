import { api } from '@/lib/api';
import type { CheckoutCreatedResponse } from '@/features/payments/types';

export type CheckoutFlow = 'pix' | 'credit-card' | 'subscription';

export interface CreateCheckoutPayload {
  customerId: string;
  productId: string;
  dueDate: string;
  startDate: string;
  idempotencyKey: string;
}

export const checkoutFlowService = {
  createPix(body: CreateCheckoutPayload) {
    return api.post<CheckoutCreatedResponse>('/payment-orders/pix', body);
  },

  createCreditCard(body: CreateCheckoutPayload) {
    return api.post<CheckoutCreatedResponse>('/payment-orders/credit-card', body);
  },

  createSubscription(body: CreateCheckoutPayload) {
    return api.post<CheckoutCreatedResponse>('/subscriptions/monthly', body);
  },
};
