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
  ProductType,
  SubscriptionStatus,
  buildExternalReference,
  mapAsaasSubscriptionToInternal,
} from '@asaas-lab/shared';
import { CheckoutStatus, CheckoutType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { CustomersService } from '../customers/customers.service';
import { ProductsService } from '../products/products.service';
import { CheckoutsService } from '../checkouts/checkouts.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../common/config/app-config.service';
import { ERROR_CODES } from '../common/constants/error-codes';

interface CreateSubscriptionInput {
  customerId: string;
  productId?: string;
  description?: string;
  amount?: number;
  startDate: string;
  internalNote?: string;
  idempotencyKey?: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly checkoutsService: CheckoutsService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  private async resolveProduct(input: CreateSubscriptionInput) {
    if (!input.productId) {
      if (!input.description || !input.amount) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Informe productId ou description + amount.',
        });
      }
      return { description: input.description, amount: input.amount, productId: undefined };
    }

    const product = await this.productsService.findOne(input.productId);
    if (!product.isActive) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Produto inativo.' });
    }
    if (product.type !== ProductType.SUBSCRIPTION) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Produto não é do tipo SUBSCRIPTION.',
      });
    }
    return {
      description: product.description,
      amount: Number(product.price),
      productId: product.id,
    };
  }

  async createMonthly(input: CreateSubscriptionInput, userId: string, correlationId?: string) {
    const resolved = await this.resolveProduct(input);
    const customer = await this.customersService.ensureSynced(input.customerId);

    const subscription = await this.prisma.subscription.create({
      data: {
        customerId: input.customerId,
        productId: resolved.productId,
        createdById: userId,
        description: resolved.description,
        externalReference: '',
        amount: new Prisma.Decimal(resolved.amount),
        status: SubscriptionStatus.PENDING,
        nextDueDate: new Date(input.startDate),
      },
    });

    const subExternalReference = buildExternalReference('subscription', subscription.id);
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { externalReference: subExternalReference },
    });

    const order = await this.prisma.paymentOrder.create({
      data: {
        customerId: input.customerId,
        productId: resolved.productId,
        createdById: userId,
        description: resolved.description,
        type: PaymentOrderType.SUBSCRIPTION_INITIAL,
        method: PaymentMethod.CREDIT_CARD,
        amount: new Prisma.Decimal(resolved.amount),
        externalReference: '',
        status: PaymentOrderStatus.PENDING,
        dueDate: new Date(input.startDate),
        subscriptionId: subscription.id,
        internalNote: input.internalNote,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const orderExternalReference = buildExternalReference('payment_order', order.id);
    await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: { externalReference: orderExternalReference },
    });

    const checkoutRecord = await this.checkoutsService.createRecord({
      paymentOrderId: order.id,
      subscriptionId: subscription.id,
      type: CheckoutType.CREDIT_CARD_SUBSCRIPTION,
      status: CheckoutStatus.CREATING,
      expiresAt: new Date(Date.now() + 1440 * 60_000),
    });

    try {
      const checkout = await this.provider.createRecurringCreditCardCheckout({
        customerId: customer.asaasCustomerId!,
        customerData: {
          name: customer.name,
          email: customer.email,
          cpfCnpj: customer.cpfCnpj,
          phone: customer.phone ?? undefined,
        },
        description: resolved.description,
        amount: resolved.amount,
        dueDate: input.startDate,
        subscriptionStartDate: input.startDate,
        cycle: 'MONTHLY',
        externalReference: orderExternalReference,
        successUrl: `${this.config.webUrl}/checkout/success?ref=${orderExternalReference}`,
        cancelUrl: `${this.config.webUrl}/checkout/canceled?ref=${orderExternalReference}`,
        expiredUrl: `${this.config.webUrl}/checkout/error?ref=${orderExternalReference}`,
      });

      await this.checkoutsService.markCreated(
        checkoutRecord.id,
        checkout.id,
        checkout.url,
        checkout as unknown as object,
      );

      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          asaasCheckoutId: checkout.id,
          checkoutUrl: checkout.url,
          status: PaymentOrderStatus.CHECKOUT_CREATED,
        },
      });

      await this.audit.log({
        actorId: userId,
        action: 'SUBSCRIPTION_CHECKOUT_CREATED',
        entityType: 'SUBSCRIPTION',
        entityId: subscription.id,
        correlationId,
        metadata: { checkoutId: checkoutRecord.id },
      });

      return {
        subscriptionId: subscription.id,
        paymentOrderId: order.id,
        checkoutId: checkoutRecord.id,
        status: PaymentOrderStatus.CHECKOUT_CREATED,
        checkoutUrl: checkout.url,
        externalReference: orderExternalReference,
      };
    } catch {
      await this.checkoutsService.markFailed(checkoutRecord.id);
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.FAILED },
      });
      throw new BadRequestException({
        code: ERROR_CODES.CHECKOUT_CREATION_FAILED,
        message: 'Não foi possível criar o Checkout da assinatura.',
      });
    }
  }

  async findAll(page = 1, limit = 20, filters?: { status?: SubscriptionStatus; customerId?: string; productId?: string }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.customerId ? { customerId: filters.customerId } : {}),
      ...(filters?.productId ? { productId: filters.productId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, price: true } },
          _count: { select: { payments: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        payments: { orderBy: { createdAt: 'asc' } },
        checkout: true,
        paymentOrders: { include: { checkout: true } },
      },
    });
    if (!sub) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Assinatura não encontrada.' });
    return sub;
  }

  async pause(id: string, userId: string, correlationId?: string) {
    const sub = await this.findOne(id);
    if (sub.status === SubscriptionStatus.PAUSED) {
      throw new BadRequestException({ code: ERROR_CODES.SUBSCRIPTION_ALREADY_PAUSED, message: 'Assinatura já está pausada.' });
    }
    if (!sub.asaasSubscriptionId) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Assinatura ainda não vinculada ao Asaas.' });
    }

    await this.provider.pauseSubscription(sub.asaasSubscriptionId);
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.PAUSED, asaasStatus: 'INACTIVE', pausedAt: new Date() },
    });
    await this.audit.log({ actorId: userId, action: 'SUBSCRIPTION_PAUSED', entityType: 'SUBSCRIPTION', entityId: id, correlationId });
    return updated;
  }

  async resume(id: string, userId: string, correlationId?: string) {
    const sub = await this.findOne(id);
    if (sub.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Assinatura não está pausada.' });
    }
    if (!sub.asaasSubscriptionId) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Assinatura ainda não vinculada ao Asaas.' });
    }

    await this.provider.resumeSubscription(sub.asaasSubscriptionId);
    const remote = await this.provider.getSubscription(sub.asaasSubscriptionId);
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: mapAsaasSubscriptionToInternal(remote.status),
        asaasStatus: remote.status,
        resumedAt: new Date(),
        nextDueDate: remote.nextDueDate ? new Date(remote.nextDueDate) : sub.nextDueDate,
      },
    });
    await this.audit.log({ actorId: userId, action: 'SUBSCRIPTION_RESUMED', entityType: 'SUBSCRIPTION', entityId: id, correlationId });
    return updated;
  }

  async cancel(id: string, reason: string, userId: string, correlationId?: string) {
    const sub = await this.findOne(id);
    if (sub.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException({ code: ERROR_CODES.SUBSCRIPTION_ALREADY_CANCELED, message: 'Assinatura já cancelada.' });
    }
    if (!sub.asaasSubscriptionId) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Assinatura ainda não vinculada ao Asaas.' });
    }

    await this.provider.cancelSubscription(sub.asaasSubscriptionId);
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELED,
        asaasStatus: 'EXPIRED',
        canceledAt: new Date(),
        canceledById: userId,
        cancelReason: reason,
      },
    });
    await this.audit.log({
      actorId: userId,
      action: 'SUBSCRIPTION_CANCELED',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      correlationId,
      metadata: { reason },
    });
    return updated;
  }
}
