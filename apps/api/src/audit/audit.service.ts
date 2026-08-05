import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeForLog } from '@asaas-lab/shared';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    const sanitized = params.metadata ? (sanitizeForLog(params.metadata) as Record<string, unknown>) : undefined;

    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        correlationId: params.correlationId,
        metadata: sanitized as Prisma.InputJsonValue | undefined,
        ipAddress: params.ipAddress,
      },
    });

    this.logger.log({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      correlationId: params.correlationId,
    });
  }
}
