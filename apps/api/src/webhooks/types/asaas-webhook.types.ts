export interface AsaasWebhookPayload {
  id?: string;
  event?: string;
  dateCreated?: string;
  payment?: {
    id?: string;
    customer?: string;
    subscription?: string;
    status?: string;
    value?: number;
    [key: string]: unknown;
  };
  subscription?: {
    id?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AsaasWebhookReceiveResult {
  received: true;
  eventId: string;
}

export interface AsaasWebhookSafeLog {
  eventId: string;
  event: string;
  paymentId?: string;
  subscriptionId?: string;
  paymentStatus?: string;
  receivedAt: string;
}
