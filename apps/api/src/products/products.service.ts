import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductBillingCycle, ProductType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateProductDto, userId: string, correlationId?: string) {
    if (dto.type === ProductType.SUBSCRIPTION && dto.billingCycle !== ProductBillingCycle.MONTHLY) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Produtos de assinatura devem ter ciclo MONTHLY.',
      });
    }
    if (dto.type === ProductType.ONE_TIME && dto.billingCycle && dto.billingCycle !== ProductBillingCycle.NONE) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Produtos avulsos devem ter ciclo NONE.',
      });
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        price: new Prisma.Decimal(dto.price),
        billingCycle:
          dto.type === ProductType.SUBSCRIPTION
            ? ProductBillingCycle.MONTHLY
            : ProductBillingCycle.NONE,
        isActive: dto.isActive ?? true,
      },
    });

    await this.audit.log({
      actorId: userId,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      correlationId,
    });

    return product;
  }

  async findAll(page = 1, limit = 20, filters?: { type?: ProductType; isActive?: boolean }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Produto não encontrado.' });
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string, correlationId?: string) {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.audit.log({
      actorId: userId,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: id,
      correlationId,
      metadata: { ...dto } as Record<string, unknown>,
    });

    return product;
  }
}
