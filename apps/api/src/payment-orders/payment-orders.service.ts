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
  buildExternalReference,
  isPaymentOrderTerminal,
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

interface CreateOrderInput {
  customerId: string;
  productId?: string;
  description?: string;
  amount?: number;
  dueDate: string;
  internalNote?: string;
  idempotencyKey?: string;
}

@Injectable()
export class PaymentOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly checkoutsService: CheckoutsService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async createPix(input: CreateOrderInput, userId: string, correlationId?: string) {
    return this.createCheckout(input, PaymentMethod.PIX, PaymentOrderType.ONE_TIME, userId, correlationId);
  }

  async createCreditCard(input: CreateOrderInput, userId: string, correlationId?: string) {
    return this.createCheckout(input, PaymentMethod.CREDIT_CARD, PaymentOrderType.ONE_TIME, userId, correlationId);
  }

  private async resolveProduct(input: CreateOrderInput) {
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
    if (product.type !== ProductType.ONE_TIME) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Produto não é do tipo ONE_TIME.',
      });
    }
    return {
      description: product.description,
      amount: Number(product.price),
      productId: product.id,
      productName: product.name,
    };
  }

  private async createCheckout(
    input: CreateOrderInput,
    method: PaymentMethod,
    type: PaymentOrderType,
    userId: string,
    correlationId?: string,
  ) {
    const resolved = await this.resolveProduct(input);

    if (input.idempotencyKey) {
      const existing = await this.prisma.paymentOrder.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { checkout: true },
      });
      if (existing && !isPaymentOrderTerminal(existing.status as PaymentOrderStatus) && existing.checkoutUrl) {
        return {
          paymentOrderId: existing.id,
          checkoutId: existing.checkout?.id,
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
        productId: resolved.productId,
        createdById: userId,
        description: resolved.description,
        type,
        method,
        amount: new Prisma.Decimal(resolved.amount),
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

    const checkoutType =
      method === PaymentMethod.PIX ? CheckoutType.PIX_ONE_TIME : CheckoutType.CREDIT_CARD_ONE_TIME;

    const checkoutRecord = await this.checkoutsService.createRecord({
      paymentOrderId: order.id,
      type: checkoutType,
      status: CheckoutStatus.CREATING,
      expiresAt: new Date(Date.now() + 1440 * 60_000),
    });

    const checkoutInput = {
      customerId: customer.asaasCustomerId!,
      customerData: {
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj,
        phone: customer.phone ?? undefined,
      },
      description: resolved.description,
      amount: resolved.amount,
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

      await this.checkoutsService.markCreated(
        checkoutRecord.id,
        checkout.id,
        checkout.url,
        checkout as unknown as object,
      );

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
        metadata: { method, amount: resolved.amount, checkoutId: checkoutRecord.id },
      });

      return {
        paymentOrderId: updated.id,
        checkoutId: checkoutRecord.id,
        status: updated.status,
        checkoutUrl: updated.checkoutUrl!,
        externalReference,
      };
    } catch (error) {
      await this.checkoutsService.markFailed(checkoutRecord.id);
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
        include: {
          customer: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, price: true } },
          checkout: true,
        },
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
        product: true,
        payments: true,
        checkout: true,
      },
    });
    if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ordem não encontrada.' });
    return order;
  }

  async findByExternalReference(externalReference: string) {
    return this.prisma.paymentOrder.findUnique({
      where: { externalReference },
      include: { customer: true, payments: true, checkout: true, product: true },
    });
  }
}
