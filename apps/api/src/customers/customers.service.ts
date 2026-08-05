import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CustomerSyncStatus, PaymentProvider, buildExternalReference } from '@asaas-lab/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { AuditService } from '../audit/audit.service';
import { ERROR_CODES } from '../common/constants/error-codes';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
  ) {}

  async create(
    data: { name: string; email: string; cpfCnpj: string; phone?: string; address?: string },
    actorId: string,
    correlationId?: string,
  ) {
    const customer = await this.prisma.customer.create({
      data: {
        name: data.name,
        email: data.email,
        cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
        phone: data.phone,
        address: data.address,
        syncStatus: CustomerSyncStatus.PENDING,
      },
    });

    await this.audit.log({
      actorId,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      correlationId,
    });

    return customer;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 10 },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Cliente não encontrado.' });
    return customer;
  }

  async update(id: string, data: Partial<{ name: string; email: string; cpfCnpj: string; phone: string; address: string }>, actorId: string) {
    const customer = await this.findOne(id);
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...data,
        cpfCnpj: data.cpfCnpj?.replace(/\D/g, ''),
        syncStatus: customer.asaasCustomerId ? CustomerSyncStatus.PENDING : customer.syncStatus,
      },
    });
    await this.audit.log({ actorId, action: 'CUSTOMER_UPDATED', entityType: 'CUSTOMER', entityId: id });
    return updated;
  }

  async sync(id: string, actorId: string, correlationId?: string) {
    const customer = await this.findOne(id);

    if (customer.asaasCustomerId) {
      try {
        await this.provider.updateCustomer(customer.asaasCustomerId, {
          name: customer.name,
          email: customer.email,
          phone: customer.phone ?? undefined,
        });
        const synced = await this.prisma.customer.update({
          where: { id },
          data: { syncStatus: CustomerSyncStatus.SYNCED, lastSyncError: null },
        });
        await this.audit.log({ actorId, action: 'CUSTOMER_SYNCED', entityType: 'CUSTOMER', entityId: id, correlationId });
        return synced;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        return this.prisma.customer.update({
          where: { id },
          data: { syncStatus: CustomerSyncStatus.FAILED, lastSyncError: message },
        });
      }
    }

    try {
      const external = buildExternalReference('customer', customer.id);
      const providerCustomer = await this.provider.createCustomer({
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj,
        phone: customer.phone ?? undefined,
        externalReference: external,
      });

      const synced = await this.prisma.customer.update({
        where: { id },
        data: {
          asaasCustomerId: providerCustomer.id,
          syncStatus: CustomerSyncStatus.SYNCED,
          lastSyncError: null,
        },
      });

      await this.audit.log({ actorId, action: 'CUSTOMER_SYNCED', entityType: 'CUSTOMER', entityId: id, correlationId });
      return synced;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return this.prisma.customer.update({
        where: { id },
        data: { syncStatus: CustomerSyncStatus.FAILED, lastSyncError: message },
      });
    }
  }

  async ensureSynced(customerId: string) {
    const customer = await this.findOne(customerId);
    if (customer.syncStatus !== CustomerSyncStatus.SYNCED || !customer.asaasCustomerId) {
      throw new BadRequestException({
        code: ERROR_CODES.CUSTOMER_NOT_SYNCED,
        message: 'Cliente precisa estar sincronizado com o Asaas antes de criar cobranças.',
      });
    }
    return customer;
  }
}
