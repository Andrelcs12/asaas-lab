import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CheckoutStatus, CheckoutType, Prisma } from '@prisma/client';
import { PaymentProvider } from '@asaas-lab/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CheckoutsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
  ) {}

  async createRecord(params: {
    paymentOrderId?: string;
    subscriptionId?: string;
    type: CheckoutType;
    asaasCheckoutId?: string;
    checkoutUrl?: string;
    status?: CheckoutStatus;
    expiresAt?: Date;
    rawData?: object;
  }) {
    return this.prisma.checkout.create({
      data: {
        paymentOrderId: params.paymentOrderId,
        subscriptionId: params.subscriptionId,
        type: params.type,
        asaasCheckoutId: params.asaasCheckoutId,
        checkoutUrl: params.checkoutUrl,
        status: params.status ?? CheckoutStatus.CREATING,
        expiresAt: params.expiresAt,
        rawData: params.rawData as Prisma.InputJsonValue,
      },
    });
  }

  async markCreated(id: string, asaasCheckoutId: string, checkoutUrl: string, rawData?: object) {
    return this.prisma.checkout.update({
      where: { id },
      data: {
        asaasCheckoutId,
        checkoutUrl,
        status: CheckoutStatus.CREATED,
        rawData: rawData as Prisma.InputJsonValue,
      },
    });
  }

  async markFailed(id: string) {
    return this.prisma.checkout.update({
      where: { id },
      data: { status: CheckoutStatus.FAILED },
    });
  }

  async findAll(page = 1, limit = 20, filters?: { status?: CheckoutStatus }) {
    const skip = (page - 1) * limit;
    const where = filters?.status ? { status: filters.status } : {};
    const [data, total] = await Promise.all([
      this.prisma.checkout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          paymentOrder: {
            include: {
              customer: { select: { id: true, name: true, email: true } },
              product: { select: { id: true, name: true, price: true } },
            },
          },
          subscription: {
            include: {
              customer: { select: { id: true, name: true, email: true } },
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      }),
      this.prisma.checkout.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const checkout = await this.prisma.checkout.findUnique({
      where: { id },
      include: {
        paymentOrder: {
          include: {
            customer: true,
            product: true,
            payments: true,
          },
        },
        subscription: {
          include: {
            customer: true,
            product: true,
            payments: true,
          },
        },
      },
    });
    if (!checkout) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Checkout não encontrado.' });
    }
    return checkout;
  }

  async reconcile(id: string, actorId?: string, correlationId?: string) {
    const checkout = await this.findOne(id);
    if (!checkout.asaasCheckoutId) {
      return { updated: false, message: 'Checkout sem ID externo.' };
    }

    // Checkouts are reconciled via related payment/subscription reconciliation
    await this.audit.log({
      actorId,
      action: 'CHECKOUT_RECONCILED',
      entityType: 'CHECKOUT',
      entityId: id,
      correlationId,
    });

    return { updated: true, checkout };
  }

  async handleCheckoutEvent(eventType: string, payload: Record<string, unknown>) {
    const checkoutData = payload.checkout as Record<string, unknown> | undefined;
    if (!checkoutData?.id) return;

    const asaasCheckoutId = String(checkoutData.id);
    const local = await this.prisma.checkout.findUnique({ where: { asaasCheckoutId } });
    if (!local) return;

    const statusMap: Record<string, CheckoutStatus> = {
      CHECKOUT_PAID: CheckoutStatus.COMPLETED,
      CHECKOUT_CANCELED: CheckoutStatus.CANCELED,
      CHECKOUT_EXPIRED: CheckoutStatus.EXPIRED,
      CHECKOUT_CREATED: CheckoutStatus.CREATED,
    };

    const newStatus = statusMap[eventType];
    if (!newStatus) return;

    await this.prisma.checkout.update({
      where: { id: local.id },
      data: {
        status: newStatus,
        ...(newStatus === CheckoutStatus.COMPLETED ? { completedAt: new Date() } : {}),
        rawData: checkoutData as Prisma.InputJsonValue,
      },
    });
  }
}
