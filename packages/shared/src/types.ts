import type {
  CustomerSyncStatus,
  InternalPaymentStatus,
  PaymentMethod,
  PaymentOrderStatus,
  PaymentOrderType,
  SubscriptionCycle,
  SubscriptionStatus,
  UserRole,
  WebhookEventStatus,
} from './enums';

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  correlationId: string;
  details?: unknown[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface CustomerDto {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string | null;
  address: string | null;
  asaasCustomerId: string | null;
  syncStatus: CustomerSyncStatus;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrderDto {
  id: string;
  customerId: string;
  description: string;
  type: PaymentOrderType;
  method: PaymentMethod;
  amount: number;
  externalReference: string;
  status: PaymentOrderStatus;
  checkoutUrl: string | null;
  dueDate: string;
  createdAt: string;
}

export interface CheckoutCreatedResponse {
  paymentOrderId: string;
  status: PaymentOrderStatus;
  checkoutUrl: string;
  externalReference: string;
}

export interface PaymentDto {
  id: string;
  paymentOrderId: string | null;
  subscriptionId: string | null;
  customerId: string;
  asaasPaymentId: string | null;
  externalReference: string | null;
  billingType: PaymentMethod | null;
  asaasStatus: string | null;
  internalStatus: InternalPaymentStatus;
  value: number;
  netValue: number | null;
  dueDate: string | null;
  paymentDate: string | null;
  confirmedDate: string | null;
  receivedDate: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDto {
  id: string;
  customerId: string;
  description: string;
  asaasSubscriptionId: string | null;
  externalReference: string;
  cycle: SubscriptionCycle;
  amount: number;
  status: SubscriptionStatus;
  asaasStatus: string | null;
  nextDueDate: string | null;
  pausedAt: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventDto {
  id: string;
  asaasEventId: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  status: WebhookEventStatus;
  attempts: number;
  lastError: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardStats {
  customersCount: number;
  pendingPayments: number;
  confirmedPayments: number;
  overduePayments: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  canceledSubscriptions: number;
  failedWebhooks: number;
  confirmedValue: number;
  pendingValue: number;
  recentEvents: WebhookEventDto[];
}

export interface SettingsInfo {
  environment: string;
  asaasBaseUrl: string;
  webhookConfigured: boolean;
  provider: string;
  connectionStatus: 'connected' | 'disconnected' | 'unknown';
  lastCheckedAt: string | null;
}

export interface CreateProviderCustomerInput {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  address?: string;
  externalReference?: string;
}

export interface UpdateProviderCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ProviderCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export interface CreatePixCheckoutInput {
  customerId: string;
  customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string;
  };
  description: string;
  amount: number;
  dueDate: string;
  externalReference: string;
  successUrl: string;
  cancelUrl: string;
  expiredUrl: string;
}

export interface CreateCreditCardCheckoutInput extends CreatePixCheckoutInput {}

export interface CreateRecurringCheckoutInput extends CreatePixCheckoutInput {
  subscriptionStartDate: string;
  cycle: 'MONTHLY';
}

export interface ProviderCheckout {
  id: string;
  url: string;
  status: string;
  externalReference: string;
}

export interface ProviderPayment {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  dueDate?: string;
  paymentDate?: string;
  confirmedDate?: string;
  creditDate?: string;
  billingType?: string;
  externalReference?: string;
  invoiceUrl?: string;
  subscription?: string;
}

export interface ProviderSubscription {
  id: string;
  status: string;
  value: number;
  cycle: string;
  nextDueDate?: string;
  externalReference?: string;
}

export interface PaymentProvider {
  createCustomer(input: CreateProviderCustomerInput): Promise<ProviderCustomer>;
  updateCustomer(
    providerCustomerId: string,
    input: UpdateProviderCustomerInput,
  ): Promise<ProviderCustomer>;
  createPixCheckout(input: CreatePixCheckoutInput): Promise<ProviderCheckout>;
  createCreditCardCheckout(
    input: CreateCreditCardCheckoutInput,
  ): Promise<ProviderCheckout>;
  createRecurringCreditCardCheckout(
    input: CreateRecurringCheckoutInput,
  ): Promise<ProviderCheckout>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  pauseSubscription(providerSubscriptionId: string): Promise<void>;
  resumeSubscription(providerSubscriptionId: string): Promise<void>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}
