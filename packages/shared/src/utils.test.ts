import { describe, expect, it } from 'vitest';
import {
  InternalPaymentStatus,
  PaymentOrderStatus,
  SubscriptionStatus,
} from './enums';
import {
  buildExternalReference,
  calculateDashboardTotals,
  isPaymentOrderTerminal,
  mapAsaasPaymentToInternal,
  mapAsaasSubscriptionToInternal,
  sanitizeForLog,
  shouldAdvancePaymentStatus,
} from './utils';

describe('shouldAdvancePaymentStatus', () => {
  it('does not regress from RECEIVED to PENDING', () => {
    expect(
      shouldAdvancePaymentStatus(InternalPaymentStatus.RECEIVED, InternalPaymentStatus.PENDING),
    ).toBe(false);
  });

  it('advances from CONFIRMED to RECEIVED', () => {
    expect(
      shouldAdvancePaymentStatus(InternalPaymentStatus.CONFIRMED, InternalPaymentStatus.RECEIVED),
    ).toBe(true);
  });

  it('allows REFUNDED after RECEIVED', () => {
    expect(
      shouldAdvancePaymentStatus(InternalPaymentStatus.RECEIVED, InternalPaymentStatus.REFUNDED),
    ).toBe(true);
  });
});

describe('buildExternalReference', () => {
  it('builds prefixed reference', () => {
    expect(buildExternalReference('payment_order', 'abc-123')).toBe('payment_order_abc-123');
  });
});

describe('mapAsaasPaymentToInternal', () => {
  it('maps CONFIRMED', () => {
    expect(mapAsaasPaymentToInternal('CONFIRMED')).toBe(InternalPaymentStatus.CONFIRMED);
  });
  it('maps RECEIVED', () => {
    expect(mapAsaasPaymentToInternal('RECEIVED')).toBe(InternalPaymentStatus.RECEIVED);
  });
  it('maps OVERDUE', () => {
    expect(mapAsaasPaymentToInternal('OVERDUE')).toBe(InternalPaymentStatus.OVERDUE);
  });
});

describe('mapAsaasSubscriptionToInternal', () => {
  it('maps INACTIVE to PAUSED', () => {
    expect(mapAsaasSubscriptionToInternal('INACTIVE')).toBe(SubscriptionStatus.PAUSED);
  });
  it('maps ACTIVE', () => {
    expect(mapAsaasSubscriptionToInternal('ACTIVE')).toBe(SubscriptionStatus.ACTIVE);
  });
});

describe('isPaymentOrderTerminal', () => {
  it('returns true for CONFIRMED', () => {
    expect(isPaymentOrderTerminal(PaymentOrderStatus.CONFIRMED)).toBe(true);
  });
  it('returns false for PENDING', () => {
    expect(isPaymentOrderTerminal(PaymentOrderStatus.PENDING)).toBe(false);
  });
});

describe('sanitizeForLog', () => {
  it('redacts sensitive fields', () => {
    const result = sanitizeForLog({ name: 'Test', accessToken: 'secret', password: '123' });
    expect(result).toEqual({ name: 'Test', accessToken: '[REDACTED]', password: '[REDACTED]' });
  });
});

describe('calculateDashboardTotals', () => {
  it('calculates totals correctly', () => {
    const result = calculateDashboardTotals([
      { internalStatus: InternalPaymentStatus.CONFIRMED, value: 100 },
      { internalStatus: InternalPaymentStatus.PENDING, value: 50 },
      { internalStatus: InternalPaymentStatus.OVERDUE, value: 30 },
    ]);
    expect(result.confirmedValue).toBe(100);
    expect(result.pendingValue).toBe(80);
    expect(result.confirmedPayments).toBe(1);
    expect(result.pendingPayments).toBe(1);
    expect(result.overduePayments).toBe(1);
  });
});
