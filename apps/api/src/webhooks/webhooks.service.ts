import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { timingSafeEqual } from 'crypto';
import {
  PaymentOrderStatus,
  SubscriptionStatus,
  mapAsaasPaymentToInternal,
  mapAsaasSubscriptionToInternal,
} from '@asaas-lab/shared';
import { WebhookEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentOrdersService } from '../payment-orders/payment-orders.service';
import { AppConfigService } from '../common/config/app-config.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly paymentOrdersService: PaymentOrdersService,
    private readonly config: AppConfigService,
  ) {}

  validateToken(token: string | undefined): boolean {
    const expected = this.config.asaasWebhookAuthToken;
    if (!expected || !token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async receive(payload: Record<string, unknown>, token?: string) {
    if (!this.validateToken(token)) {
      return { ok: false, status: 401 };
    }

    const asaasEventId = String(payload.id ?? '');
    const eventType = String(payload.event ?? '');

    if (!asaasEventId || !eventType) {
      return { ok: false, status: 400 };
    }

    const existing = await this.prisma.webhookEvent.findUnique({ where: { asaasEventId } });
    if (existing) {
      return { ok: true, status: 200, duplicate: true };
    }

    const payment = payload.payment as Record<string, unknown> | undefined;
    const subscription = payload.subscription as Record<string, unknown> | undefined;

    await this.prisma.webhookEvent.create({
      data: {
        asaasEventId,
        eventType,
        resourceType: payment ? 'PAYMENT' : subscription ? 'SUBSCRIPTION' : 'UNKNOWN',
        resourceId: String(payment?.id ?? subscription?.id ?? ''),
        payload: payload as object,
        status: WebhookEventStatus.PENDING,
      },
    });

    return { ok: true, status: 200 };
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processPendingEvents() {
    if (!this.config.hasDatabase) return;
    if (this.processing) return;
    this.processing = true;

    try {
      const events = await this.prisma.webhookEvent.findMany({
        where: {
          status: { in: [WebhookEventStatus.PENDING, WebhookEventStatus.FAILED] },
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
          attempts: { lt: MAX_ATTEMPTS },
        },
        take: 10,
        orderBy: { receivedAt: 'asc' },
      });

      for (const event of events) {
        await this.processEvent(event.id);
      }
    } finally {
      this.processing = false;
    }
  }

  async processEvent(eventId: string) {
    const event = await this.prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (!event || event.status === WebhookEventStatus.PROCESSED) return;

    const claimed = await this.prisma.webhookEvent.updateMany({
      where: { id: eventId, status: { in: [WebhookEventStatus.PENDING, WebhookEventStatus.FAILED] } },
      data: { status: WebhookEventStatus.PROCESSING },
    });
    if (claimed.count === 0) return;

    try {
      const payload = event.payload as Record<string, unknown>;
      await this.handleEvent(event.eventType, payload);

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { status: WebhookEventStatus.PROCESSED, processedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      const backoffMinutes = Math.pow(2, attempts);
      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: attempts >= MAX_ATTEMPTS ? WebhookEventStatus.FAILED : WebhookEventStatus.PENDING,
          attempts,
          lastError: error instanceof Error ? error.message : 'Erro desconhecido',
          nextRetryAt: new Date(Date.now() + backoffMinutes * 60_000),
        },
      });
    }
  }

  private async handleEvent(eventType: string, payload: Record<string, unknown>) {
    const payment = payload.payment as Record<string, unknown> | undefined;
    const subscription = payload.subscription as Record<string, unknown> | undefined;

    if (eventType.startsWith('PAYMENT_') && payment) {
      await this.handlePaymentEvent(eventType, payment);
      return;
    }

    if (eventType.startsWith('SUBSCRIPTION_') && subscription) {
      await this.handleSubscriptionEvent(eventType, subscription);
      return;
    }

    if (eventType.startsWith('CHECKOUT_')) {
      this.logger.debug(`Checkout event ignored for processing: ${eventType}`);
      return;
    }

    this.logger.debug(`Unknown event type: ${eventType}`);
  }

  private async handlePaymentEvent(_eventType: string, payment: Record<string, unknown>) {
    const asaasPaymentId = String(payment.id);
    const externalReference = payment.externalReference ? String(payment.externalReference) : undefined;
    const subscriptionRef = payment.subscription ? String(payment.subscription) : undefined;

    let order = externalReference
      ? await this.paymentOrdersService.findByExternalReference(externalReference)
      : null;

    let customerId = order?.customerId;
    let subscriptionId: string | undefined;

    if (subscriptionRef) {
      const sub = await this.prisma.subscription.findFirst({
        where: { asaasSubscriptionId: subscriptionRef },
      });
      if (sub) {
        customerId = sub.customerId;
        subscriptionId = sub.id;
      }
    }

    if (!customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { asaasCustomerId: String(payment.customer ?? '') },
      });
      customerId = customer?.id;
    }

    if (!customerId) return;

    const renewalCount = subscriptionId
      ? await this.prisma.payment.count({ where: { subscriptionId } })
      : undefined;

    await this.paymentsService.upsertFromWebhook({
      asaasPaymentId,
      customerId,
      paymentOrderId: order?.id,
      subscriptionId,
      externalReference,
      remote: {
        status: String(payment.status ?? 'PENDING'),
        value: Number(payment.value ?? 0),
        netValue: payment.netValue ? Number(payment.netValue) : undefined,
        dueDate: payment.dueDate ? String(payment.dueDate) : undefined,
        paymentDate: payment.paymentDate ? String(payment.paymentDate) : undefined,
        confirmedDate: payment.confirmedDate ? String(payment.confirmedDate) : undefined,
        creditDate: payment.creditDate ? String(payment.creditDate) : undefined,
        billingType: payment.billingType ? String(payment.billingType) : undefined,
        invoiceUrl: payment.invoiceUrl ? String(payment.invoiceUrl) : undefined,
      },
      renewalNumber: renewalCount,
    });

    if (order) {
      const internal = mapAsaasPaymentToInternal(String(payment.status ?? 'PENDING'));
      const orderStatus =
        internal === 'CONFIRMED' || internal === 'RECEIVED'
          ? PaymentOrderStatus.CONFIRMED
          : internal === 'OVERDUE'
            ? PaymentOrderStatus.PROCESSING
            : order.status;

      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: orderStatus as PaymentOrderStatus },
      });
    }
  }

  private async handleSubscriptionEvent(_eventType: string, subscription: Record<string, unknown>) {
    const asaasSubscriptionId = String(subscription.id);
    const externalReference = subscription.externalReference ? String(subscription.externalReference) : undefined;

    let local = await this.prisma.subscription.findFirst({
      where: {
        OR: [{ asaasSubscriptionId }, ...(externalReference ? [{ externalReference }] : [])],
      },
    });

    if (!local && externalReference?.startsWith('subscription_')) {
      const id = externalReference.replace('subscription_', '');
      local = await this.prisma.subscription.findUnique({ where: { id } });
    }

    if (!local) return;

    const asaasStatus = String(subscription.status ?? 'ACTIVE');
    await this.prisma.subscription.update({
      where: { id: local.id },
      data: {
        asaasSubscriptionId,
        asaasStatus,
        status: mapAsaasSubscriptionToInternal(asaasStatus),
        nextDueDate: subscription.nextDueDate ? new Date(String(subscription.nextDueDate)) : local.nextDueDate,
        rawData: subscription as object,
        ...(asaasStatus === 'INACTIVE' ? { pausedAt: new Date() } : {}),
        ...(asaasStatus === 'ACTIVE' && local.status === SubscriptionStatus.PAUSED
          ? { resumedAt: new Date() }
          : {}),
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({ skip, take: limit, orderBy: { receivedAt: 'desc' } }),
      this.prisma.webhookEvent.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    return this.prisma.webhookEvent.findUniqueOrThrow({ where: { id } });
  }

  async reprocess(id: string) {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: { status: WebhookEventStatus.PENDING, nextRetryAt: new Date() },
    });
    await this.processEvent(id);
    return this.findOne(id);
  }
}
