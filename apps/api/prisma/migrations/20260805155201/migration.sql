-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_asaasPaymentId_idx" ON "Payment"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "PaymentOrder_idempotencyKey_idx" ON "PaymentOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Subscription_asaasSubscriptionId_idx" ON "Subscription"("asaasSubscriptionId");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_nextRetryAt_idx" ON "WebhookEvent"("nextRetryAt");
