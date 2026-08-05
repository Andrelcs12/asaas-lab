import { InternalPaymentStatus, PaymentOrderStatus, SubscriptionStatus } from './enums';
export declare function buildExternalReference(prefix: string, id: string): string;
export declare function buildIdempotencyKey(userId: string, customerId: string, type: string): string;
export declare function mapAsaasPaymentToInternal(asaasStatus: string): InternalPaymentStatus;
export declare function mapAsaasSubscriptionToInternal(asaasStatus: string): SubscriptionStatus;
export declare function isPaymentOrderTerminal(status: PaymentOrderStatus): boolean;
export declare function sanitizeForLog(data: unknown): unknown;
export declare function maskCpfCnpj(value: string): string;
export declare function formatCurrency(value: number): string;
export declare function calculateDashboardTotals(payments: {
    internalStatus: InternalPaymentStatus;
    value: number;
}[]): {
    confirmedValue: number;
    pendingValue: number;
    pendingPayments: number;
    confirmedPayments: number;
    overduePayments: number;
};
