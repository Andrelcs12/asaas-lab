import {
  AsaasPaymentStatus,
  AsaasSubscriptionStatus,
  InternalPaymentStatus,
  PaymentOrderStatus,
  SubscriptionStatus,
} from './enums';

export function buildExternalReference(prefix: string, id: string): string {
  return `${prefix}_${id}`;
}

export function buildIdempotencyKey(userId: string, customerId: string, type: string): string {
  return `${userId}:${customerId}:${type}:${Date.now()}`;
}

const PAYMENT_STATUS_RANK: Record<InternalPaymentStatus, number> = {
  [InternalPaymentStatus.PENDING]: 10,
  [InternalPaymentStatus.PROCESSING]: 20,
  [InternalPaymentStatus.OVERDUE]: 30,
  [InternalPaymentStatus.CONFIRMED]: 40,
  [InternalPaymentStatus.RECEIVED]: 50,
  [InternalPaymentStatus.REFUNDED]: 60,
  [InternalPaymentStatus.CANCELED]: 60,
  [InternalPaymentStatus.FAILED]: 60,
};

export function shouldAdvancePaymentStatus(
  current: InternalPaymentStatus,
  incoming: InternalPaymentStatus,
): boolean {
  if (current === incoming) return false;
  return PAYMENT_STATUS_RANK[incoming] >= PAYMENT_STATUS_RANK[current];
}

export function mapAsaasPaymentToInternal(asaasStatus: string): InternalPaymentStatus {
  const map: Record<string, InternalPaymentStatus> = {
    [AsaasPaymentStatus.PENDING]: InternalPaymentStatus.PENDING,
    [AsaasPaymentStatus.CONFIRMED]: InternalPaymentStatus.CONFIRMED,
    [AsaasPaymentStatus.RECEIVED]: InternalPaymentStatus.RECEIVED,
    [AsaasPaymentStatus.OVERDUE]: InternalPaymentStatus.OVERDUE,
    [AsaasPaymentStatus.REFUNDED]: InternalPaymentStatus.REFUNDED,
    [AsaasPaymentStatus.RECEIVED_IN_CASH]: InternalPaymentStatus.RECEIVED,
    [AsaasPaymentStatus.AWAITING_RISK_ANALYSIS]: InternalPaymentStatus.PROCESSING,
    [AsaasPaymentStatus.REFUND_REQUESTED]: InternalPaymentStatus.REFUNDED,
    [AsaasPaymentStatus.REFUND_IN_PROGRESS]: InternalPaymentStatus.REFUNDED,
  };
  return map[asaasStatus] ?? InternalPaymentStatus.PROCESSING;
}

export function mapAsaasSubscriptionToInternal(asaasStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    [AsaasSubscriptionStatus.ACTIVE]: SubscriptionStatus.ACTIVE,
    [AsaasSubscriptionStatus.INACTIVE]: SubscriptionStatus.PAUSED,
    [AsaasSubscriptionStatus.EXPIRED]: SubscriptionStatus.CANCELED,
  };
  return map[asaasStatus] ?? SubscriptionStatus.PENDING;
}

export function isPaymentOrderTerminal(status: PaymentOrderStatus): boolean {
  return [
    PaymentOrderStatus.CONFIRMED,
    PaymentOrderStatus.FAILED,
    PaymentOrderStatus.EXPIRED,
    PaymentOrderStatus.CANCELED,
  ].includes(status);
}

export function sanitizeForLog(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeForLog);

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'access_token',
    'accessToken',
    'token',
    'apiKey',
    'creditCard',
    'creditCardNumber',
    'cvv',
    'number',
  ];

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = sanitizeForLog(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function maskCpfCnpj(value: string): string {
  if (value.length <= 4) return '****';
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function calculateDashboardTotals(payments: { internalStatus: InternalPaymentStatus; value: number }[]) {
  let confirmedValue = 0;
  let pendingValue = 0;
  let pendingPayments = 0;
  let confirmedPayments = 0;
  let overduePayments = 0;

  for (const p of payments) {
    if (p.internalStatus === InternalPaymentStatus.CONFIRMED || p.internalStatus === InternalPaymentStatus.RECEIVED) {
      confirmedValue += p.value;
      confirmedPayments++;
    } else if (p.internalStatus === InternalPaymentStatus.OVERDUE) {
      overduePayments++;
      pendingValue += p.value;
    } else if (
      p.internalStatus === InternalPaymentStatus.PENDING ||
      p.internalStatus === InternalPaymentStatus.PROCESSING
    ) {
      pendingPayments++;
      pendingValue += p.value;
    }
  }

  return { confirmedValue, pendingValue, pendingPayments, confirmedPayments, overduePayments };
}
