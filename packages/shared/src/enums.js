"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASAAS_CHECKOUT_EVENTS = exports.ASAAS_SUBSCRIPTION_EVENTS = exports.ASAAS_PAYMENT_EVENTS = exports.AsaasSubscriptionStatus = exports.AsaasPaymentStatus = exports.AuditEntityType = exports.WebhookEventStatus = exports.SubscriptionStatus = exports.SubscriptionCycle = exports.InternalPaymentStatus = exports.PaymentOrderStatus = exports.PaymentMethod = exports.PaymentOrderType = exports.CustomerSyncStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (exports.UserRole = UserRole = {}));
var CustomerSyncStatus;
(function (CustomerSyncStatus) {
    CustomerSyncStatus["PENDING"] = "PENDING";
    CustomerSyncStatus["SYNCED"] = "SYNCED";
    CustomerSyncStatus["FAILED"] = "FAILED";
})(CustomerSyncStatus || (exports.CustomerSyncStatus = CustomerSyncStatus = {}));
var PaymentOrderType;
(function (PaymentOrderType) {
    PaymentOrderType["ONE_TIME"] = "ONE_TIME";
    PaymentOrderType["SUBSCRIPTION_INITIAL"] = "SUBSCRIPTION_INITIAL";
    PaymentOrderType["SUBSCRIPTION_RENEWAL"] = "SUBSCRIPTION_RENEWAL";
})(PaymentOrderType || (exports.PaymentOrderType = PaymentOrderType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["PIX"] = "PIX";
    PaymentMethod["CREDIT_CARD"] = "CREDIT_CARD";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentOrderStatus;
(function (PaymentOrderStatus) {
    PaymentOrderStatus["DRAFT"] = "DRAFT";
    PaymentOrderStatus["PENDING"] = "PENDING";
    PaymentOrderStatus["CHECKOUT_CREATED"] = "CHECKOUT_CREATED";
    PaymentOrderStatus["PROCESSING"] = "PROCESSING";
    PaymentOrderStatus["CONFIRMED"] = "CONFIRMED";
    PaymentOrderStatus["FAILED"] = "FAILED";
    PaymentOrderStatus["EXPIRED"] = "EXPIRED";
    PaymentOrderStatus["CANCELED"] = "CANCELED";
})(PaymentOrderStatus || (exports.PaymentOrderStatus = PaymentOrderStatus = {}));
var InternalPaymentStatus;
(function (InternalPaymentStatus) {
    InternalPaymentStatus["PENDING"] = "PENDING";
    InternalPaymentStatus["PROCESSING"] = "PROCESSING";
    InternalPaymentStatus["CONFIRMED"] = "CONFIRMED";
    InternalPaymentStatus["RECEIVED"] = "RECEIVED";
    InternalPaymentStatus["OVERDUE"] = "OVERDUE";
    InternalPaymentStatus["REFUNDED"] = "REFUNDED";
    InternalPaymentStatus["FAILED"] = "FAILED";
    InternalPaymentStatus["CANCELED"] = "CANCELED";
})(InternalPaymentStatus || (exports.InternalPaymentStatus = InternalPaymentStatus = {}));
var SubscriptionCycle;
(function (SubscriptionCycle) {
    SubscriptionCycle["MONTHLY"] = "MONTHLY";
})(SubscriptionCycle || (exports.SubscriptionCycle = SubscriptionCycle = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["PENDING"] = "PENDING";
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["PAUSED"] = "PAUSED";
    SubscriptionStatus["OVERDUE"] = "OVERDUE";
    SubscriptionStatus["CANCELED"] = "CANCELED";
    SubscriptionStatus["FAILED"] = "FAILED";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var WebhookEventStatus;
(function (WebhookEventStatus) {
    WebhookEventStatus["PENDING"] = "PENDING";
    WebhookEventStatus["PROCESSING"] = "PROCESSING";
    WebhookEventStatus["PROCESSED"] = "PROCESSED";
    WebhookEventStatus["FAILED"] = "FAILED";
    WebhookEventStatus["IGNORED"] = "IGNORED";
})(WebhookEventStatus || (exports.WebhookEventStatus = WebhookEventStatus = {}));
var AuditEntityType;
(function (AuditEntityType) {
    AuditEntityType["USER"] = "USER";
    AuditEntityType["CUSTOMER"] = "CUSTOMER";
    AuditEntityType["PAYMENT_ORDER"] = "PAYMENT_ORDER";
    AuditEntityType["PAYMENT"] = "PAYMENT";
    AuditEntityType["SUBSCRIPTION"] = "SUBSCRIPTION";
    AuditEntityType["WEBHOOK"] = "WEBHOOK";
    AuditEntityType["RECONCILIATION"] = "RECONCILIATION";
})(AuditEntityType || (exports.AuditEntityType = AuditEntityType = {}));
var AsaasPaymentStatus;
(function (AsaasPaymentStatus) {
    AsaasPaymentStatus["PENDING"] = "PENDING";
    AsaasPaymentStatus["RECEIVED"] = "RECEIVED";
    AsaasPaymentStatus["CONFIRMED"] = "CONFIRMED";
    AsaasPaymentStatus["OVERDUE"] = "OVERDUE";
    AsaasPaymentStatus["REFUNDED"] = "REFUNDED";
    AsaasPaymentStatus["RECEIVED_IN_CASH"] = "RECEIVED_IN_CASH";
    AsaasPaymentStatus["REFUND_REQUESTED"] = "REFUND_REQUESTED";
    AsaasPaymentStatus["REFUND_IN_PROGRESS"] = "REFUND_IN_PROGRESS";
    AsaasPaymentStatus["CHARGEBACK_REQUESTED"] = "CHARGEBACK_REQUESTED";
    AsaasPaymentStatus["CHARGEBACK_DISPUTE"] = "CHARGEBACK_DISPUTE";
    AsaasPaymentStatus["AWAITING_CHARGEBACK_REVERSAL"] = "AWAITING_CHARGEBACK_REVERSAL";
    AsaasPaymentStatus["DUNNING_REQUESTED"] = "DUNNING_REQUESTED";
    AsaasPaymentStatus["DUNNING_RECEIVED"] = "DUNNING_RECEIVED";
    AsaasPaymentStatus["AWAITING_RISK_ANALYSIS"] = "AWAITING_RISK_ANALYSIS";
})(AsaasPaymentStatus || (exports.AsaasPaymentStatus = AsaasPaymentStatus = {}));
var AsaasSubscriptionStatus;
(function (AsaasSubscriptionStatus) {
    AsaasSubscriptionStatus["ACTIVE"] = "ACTIVE";
    AsaasSubscriptionStatus["INACTIVE"] = "INACTIVE";
    AsaasSubscriptionStatus["EXPIRED"] = "EXPIRED";
})(AsaasSubscriptionStatus || (exports.AsaasSubscriptionStatus = AsaasSubscriptionStatus = {}));
exports.ASAAS_PAYMENT_EVENTS = [
    'PAYMENT_CREATED',
    'PAYMENT_UPDATED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE',
    'PAYMENT_DELETED',
    'PAYMENT_REFUNDED',
    'PAYMENT_RESTORED',
    'PAYMENT_ANTICIPATED',
    'PAYMENT_AWAITING_RISK_ANALYSIS',
    'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
    'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
    'PAYMENT_BANK_SLIP_VIEWED',
    'PAYMENT_CHECKOUT_VIEWED',
    'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_CHARGEBACK_DISPUTE',
    'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
    'PAYMENT_DUNNING_RECEIVED',
    'PAYMENT_DUNNING_REQUESTED',
];
exports.ASAAS_SUBSCRIPTION_EVENTS = [
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_UPDATED',
    'SUBSCRIPTION_INACTIVATED',
    'SUBSCRIPTION_DELETED',
];
exports.ASAAS_CHECKOUT_EVENTS = [
    'CHECKOUT_CREATED',
    'CHECKOUT_CANCELED',
    'CHECKOUT_EXPIRED',
    'CHECKOUT_PAID',
];
//# sourceMappingURL=enums.js.map