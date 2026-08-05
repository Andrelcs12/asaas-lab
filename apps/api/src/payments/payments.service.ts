import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InternalPaymentStatus, PaymentProvider, mapAsaasPaymentToInternal } from '@asaas-lab/shared';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
  ) {}

  async findAll(page = 1, limit = 20, filters?: { status?: InternalPaymentStatus; customerId?: string }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(filters?.status ? { internalStatus: filters.status } : {}),
      ...(filters?.customerId ? { customerId: filters.customerId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        paymentOrder: true,
        subscription: true,
      },
    });
    if (!payment) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Pagamento não encontrado.' });
    return payment;
  }

  async getStatus(id: string) {
    const payment = await this.findOne(id);
    return {
      id: payment.id,
      internalStatus: payment.internalStatus,
      asaasStatus: payment.asaasStatus,
      value: payment.value,
      confirmedDate: payment.confirmedDate,
    };
  }

  async reconcile(id: string, actorId?: string, correlationId?: string) {
    const payment = await this.findOne(id);
    if (!payment.asaasPaymentId) {
      return { updated: false, message: 'Pagamento sem ID externo.' };
    }

    const remote = await this.provider.getPayment(payment.asaasPaymentId);
    const internalStatus = mapAsaasPaymentToInternal(remote.status);

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        asaasStatus: remote.status,
        internalStatus,
        netValue: remote.netValue ? new Prisma.Decimal(remote.netValue) : payment.netValue,
        paymentDate: remote.paymentDate ? new Date(remote.paymentDate) : payment.paymentDate,
        confirmedDate: remote.confirmedDate ? new Date(remote.confirmedDate) : payment.confirmedDate,
        receivedDate: remote.creditDate ? new Date(remote.creditDate) : payment.receivedDate,
        invoiceUrl: remote.invoiceUrl ?? payment.invoiceUrl,
        rawData: remote as unknown as Prisma.InputJsonValue,
      },
    });

    await this.audit.log({
      actorId,
      action: 'PAYMENT_RECONCILED',
      entityType: 'PAYMENT',
      entityId: id,
      correlationId,
      metadata: { asaasStatus: remote.status, internalStatus },
    });

    return { updated: true, payment: updated };
  }

  async upsertFromWebhook(params: {
    asaasPaymentId: string;
    customerId: string;
    paymentOrderId?: string;
    subscriptionId?: string;
    externalReference?: string;
    remote: {
      status: string;
      value: number;
      netValue?: number;
      dueDate?: string;
      paymentDate?: string;
      confirmedDate?: string;
      creditDate?: string;
      billingType?: string;
      invoiceUrl?: string;
    };
    renewalNumber?: number;
  }) {
    const internalStatus = mapAsaasPaymentToInternal(params.remote.status);
    const existing = await this.prisma.payment.findUnique({
      where: { asaasPaymentId: params.asaasPaymentId },
    });

    const data = {
      customerId: params.customerId,
      paymentOrderId: params.paymentOrderId,
      subscriptionId: params.subscriptionId,
      externalReference: params.externalReference,
      asaasStatus: params.remote.status,
      internalStatus,
      value: new Prisma.Decimal(params.remote.value),
      netValue: params.remote.netValue ? new Prisma.Decimal(params.remote.netValue) : undefined,
      billingType:
        params.remote.billingType === 'PIX'
          ? PaymentMethod.PIX
          : params.remote.billingType === 'CREDIT_CARD'
            ? PaymentMethod.CREDIT_CARD
            : undefined,
      dueDate: params.remote.dueDate ? new Date(params.remote.dueDate) : undefined,
      paymentDate: params.remote.paymentDate ? new Date(params.remote.paymentDate) : undefined,
      confirmedDate: params.remote.confirmedDate ? new Date(params.remote.confirmedDate) : undefined,
      receivedDate: params.remote.creditDate ? new Date(params.remote.creditDate) : undefined,
      invoiceUrl: params.remote.invoiceUrl,
      renewalNumber: params.renewalNumber,
      rawData: params.remote as unknown as Prisma.InputJsonValue,
    };

    if (existing) {
      return this.prisma.payment.update({ where: { id: existing.id }, data });
    }

    return this.prisma.payment.create({
      data: { asaasPaymentId: params.asaasPaymentId, ...data },
    });
  }
}
