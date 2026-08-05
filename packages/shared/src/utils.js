"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExternalReference = buildExternalReference;
exports.buildIdempotencyKey = buildIdempotencyKey;
exports.mapAsaasPaymentToInternal = mapAsaasPaymentToInternal;
exports.mapAsaasSubscriptionToInternal = mapAsaasSubscriptionToInternal;
exports.isPaymentOrderTerminal = isPaymentOrderTerminal;
exports.sanitizeForLog = sanitizeForLog;
exports.maskCpfCnpj = maskCpfCnpj;
exports.formatCurrency = formatCurrency;
exports.calculateDashboardTotals = calculateDashboardTotals;
const enums_1 = require("./enums");
function buildExternalReference(prefix, id) {
    return `${prefix}_${id}`;
}
function buildIdempotencyKey(userId, customerId, type) {
    return `${userId}:${customerId}:${type}:${Date.now()}`;
}
function mapAsaasPaymentToInternal(asaasStatus) {
    const map = {
        [enums_1.AsaasPaymentStatus.PENDING]: enums_1.InternalPaymentStatus.PENDING,
        [enums_1.AsaasPaymentStatus.CONFIRMED]: enums_1.InternalPaymentStatus.CONFIRMED,
        [enums_1.AsaasPaymentStatus.RECEIVED]: enums_1.InternalPaymentStatus.RECEIVED,
        [enums_1.AsaasPaymentStatus.OVERDUE]: enums_1.InternalPaymentStatus.OVERDUE,
        [enums_1.AsaasPaymentStatus.REFUNDED]: enums_1.InternalPaymentStatus.REFUNDED,
        [enums_1.AsaasPaymentStatus.RECEIVED_IN_CASH]: enums_1.InternalPaymentStatus.RECEIVED,
        [enums_1.AsaasPaymentStatus.AWAITING_RISK_ANALYSIS]: enums_1.InternalPaymentStatus.PROCESSING,
        [enums_1.AsaasPaymentStatus.REFUND_REQUESTED]: enums_1.InternalPaymentStatus.REFUNDED,
        [enums_1.AsaasPaymentStatus.REFUND_IN_PROGRESS]: enums_1.InternalPaymentStatus.REFUNDED,
    };
    return map[asaasStatus] ?? enums_1.InternalPaymentStatus.PROCESSING;
}
function mapAsaasSubscriptionToInternal(asaasStatus) {
    const map = {
        [enums_1.AsaasSubscriptionStatus.ACTIVE]: enums_1.SubscriptionStatus.ACTIVE,
        [enums_1.AsaasSubscriptionStatus.INACTIVE]: enums_1.SubscriptionStatus.PAUSED,
        [enums_1.AsaasSubscriptionStatus.EXPIRED]: enums_1.SubscriptionStatus.CANCELED,
    };
    return map[asaasStatus] ?? enums_1.SubscriptionStatus.PENDING;
}
function isPaymentOrderTerminal(status) {
    return [
        enums_1.PaymentOrderStatus.CONFIRMED,
        enums_1.PaymentOrderStatus.FAILED,
        enums_1.PaymentOrderStatus.EXPIRED,
        enums_1.PaymentOrderStatus.CANCELED,
    ].includes(status);
}
function sanitizeForLog(data) {
    if (data === null || data === undefined)
        return data;
    if (typeof data !== 'object')
        return data;
    if (Array.isArray(data))
        return data.map(sanitizeForLog);
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
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
            result[key] = '[REDACTED]';
        }
        else if (typeof value === 'object') {
            result[key] = sanitizeForLog(value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function maskCpfCnpj(value) {
    if (value.length <= 4)
        return '****';
    return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}
function calculateDashboardTotals(payments) {
    let confirmedValue = 0;
    let pendingValue = 0;
    let pendingPayments = 0;
    let confirmedPayments = 0;
    let overduePayments = 0;
    for (const p of payments) {
        if (p.internalStatus === enums_1.InternalPaymentStatus.CONFIRMED || p.internalStatus === enums_1.InternalPaymentStatus.RECEIVED) {
            confirmedValue += p.value;
            confirmedPayments++;
        }
        else if (p.internalStatus === enums_1.InternalPaymentStatus.OVERDUE) {
            overduePayments++;
            pendingValue += p.value;
        }
        else if (p.internalStatus === enums_1.InternalPaymentStatus.PENDING ||
            p.internalStatus === enums_1.InternalPaymentStatus.PROCESSING) {
            pendingPayments++;
            pendingValue += p.value;
        }
    }
    return { confirmedValue, pendingValue, pendingPayments, confirmedPayments, overduePayments };
}
//# sourceMappingURL=utils.js.map