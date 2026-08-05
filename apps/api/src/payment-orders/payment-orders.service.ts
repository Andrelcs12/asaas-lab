import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentMethod,
  PaymentOrderStatus,
  PaymentOrderType,
  PaymentProvider,
  buildExternalReference,
  isPaymentOrderTerminal,
} from '@asaas-lab/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { CustomersService } from '../customers/customers.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../common/config/app-config.service';
import { ERROR_CODES } from '../common/constants/error-codes';

@Injectable()
export class PaymentOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
    private readonly customersService: CustomersService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async createPix(
    input: {
      customerId: string;
      description: string;
      amount: number;
      dueDate: string;
      internalNote?: string;
      idempotencyKey?: string;
    },
    userId: string,
    correlationId?: string,
  ) {
    return this.createCheckout(input, PaymentMethod.PIX, PaymentOrderType.ONE_TIME, userId, correlationId);
  }

  async createCreditCard(
    input: {
      customerId: string;
      description: string;
      amount: number;
      dueDate: string;
      internalNote?: string;
      idempotencyKey?: string;
    },
    userId: string,
    correlationId?: string,
  ) {
    return this.createCheckout(input, PaymentMethod.CREDIT_CARD, PaymentOrderType.ONE_TIME, userId, correlationId);
  }

  private async createCheckout(
    input: {
      customerId: string;
      description: string;
      amount: number;
      dueDate: string;
      internalNote?: string;
      idempotencyKey?: string;
    },
    method: PaymentMethod,
    type: PaymentOrderType,
    userId: string,
    correlationId?: string,
  ) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.paymentOrder.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing && !isPaymentOrderTerminal(existing.status as PaymentOrderStatus) && existing.checkoutUrl) {
        return {
          paymentOrderId: existing.id,
          status: existing.status,
          checkoutUrl: existing.checkoutUrl,
          externalReference: existing.externalReference,
        };
      }
    }

    const customer = await this.customersService.ensureSynced(input.customerId);

    const order = await this.prisma.paymentOrder.create({
      data: {
        customerId: input.customerId,
        createdById: userId,
        description: input.description,
        type,
        method,
        amount: new Prisma.Decimal(input.amount),
        externalReference: '',
        idempotencyKey: input.idempotencyKey,
        status: PaymentOrderStatus.PENDING,
        dueDate: new Date(input.dueDate),
        internalNote: input.internalNote,
      },
    });

    const externalReference = buildExternalReference('payment_order', order.id);
    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { externalReference },
    });

    const checkoutInput = {
      customerId: customer.asaasCustomerId!,
      customerData: {
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj,
        phone: customer.phone ?? undefined,
      },
      description: input.description,
      amount: input.amount,
      dueDate: input.dueDate,
      externalReference,
      successUrl: `${this.config.webUrl}/checkout/success?ref=${externalReference}`,
      cancelUrl: `${this.config.webUrl}/checkout/canceled?ref=${externalReference}`,
      expiredUrl: `${this.config.webUrl}/checkout/error?ref=${externalReference}`,
    };

    try {
      const checkout =
        method === PaymentMethod.PIX
          ? await this.provider.createPixCheckout(checkoutInput)
          : await this.provider.createCreditCardCheckout(checkoutInput);

      const updated = await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          asaasCheckoutId: checkout.id,
          checkoutUrl: checkout.url,
          status: PaymentOrderStatus.CHECKOUT_CREATED,
        },
      });

      await this.audit.log({
        actorId: userId,
        action: 'CHECKOUT_CREATED',
        entityType: 'PAYMENT_ORDER',
        entityId: order.id,
        correlationId,
        metadata: { method, amount: input.amount },
      });

      return {
        paymentOrderId: updated.id,
        status: updated.status,
        checkoutUrl: updated.checkoutUrl!,
        externalReference,
      };
    } catch (error) {
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: PaymentOrderStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Erro ao criar checkout',
        },
      });
      throw new BadRequestException({
        code: ERROR_CODES.CHECKOUT_CREATION_FAILED,
        message: 'Não foi possível criar o Checkout.',
      });
    }
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.paymentOrder.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: true,
      },
    });
    if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ordem não encontrada.' });
    return order;
  }

  async findByExternalReference(externalReference: string) {
    return this.prisma.paymentOrder.findUnique({
      where: { externalReference },
      include: { customer: true, payments: true },
    });
  }
}
