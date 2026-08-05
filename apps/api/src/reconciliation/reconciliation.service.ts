import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InternalPaymentStatus, SubscriptionStatus, mapAsaasSubscriptionToInternal } from '@asaas-lab/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditService } from '../audit/audit.service';
import { Inject } from '@nestjs/common';
import { PaymentProvider } from '@asaas-lab/shared';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { AppConfigService } from '../common/config/app-config.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoReconcile() {
    if (!this.config.hasDatabase || !this.config.asaasApiKey) return;
    if (this.running) return;

    try {
      await this.run('SYSTEM');
    } catch (error) {
      this.logger.error(
        'Reconciliação automática falhou.',
        error instanceof Error ? error.message : error,
      );
    }
  }

  async run(actorId = 'SYSTEM', correlationId?: string) {
    if (this.running) {
      return { status: 'SKIPPED', message: 'Reconciliação já em andamento.' };
    }

    this.running = true;
    const run = await this.prisma.reconciliationRun.create({ data: { status: 'RUNNING' } });

    let paymentsChecked = 0;
    let subscriptionsChecked = 0;
    let divergencesFound = 0;
    let divergencesFixed = 0;

    try {
      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          internalStatus: { in: [InternalPaymentStatus.PENDING, InternalPaymentStatus.PROCESSING] },
          asaasPaymentId: { not: null },
        },
        take: 50,
      });

      for (const payment of pendingPayments) {
        paymentsChecked++;
        const result = await this.paymentsService.reconcile(payment.id, actorId, correlationId);
        if (result.updated) {
          divergencesFound++;
          divergencesFixed++;
        }
      }

      const activeSubs = await this.prisma.subscription.findMany({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] },
          asaasSubscriptionId: { not: null },
        },
        take: 50,
      });

      for (const sub of activeSubs) {
        subscriptionsChecked++;
        const remote = await this.provider.getSubscription(sub.asaasSubscriptionId!);
        const mapped = mapAsaasSubscriptionToInternal(remote.status);
        if (mapped !== sub.status || remote.nextDueDate !== sub.nextDueDate?.toISOString().slice(0, 10)) {
          divergencesFound++;
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: mapped,
              asaasStatus: remote.status,
              nextDueDate: remote.nextDueDate ? new Date(remote.nextDueDate) : sub.nextDueDate,
            },
          });
          divergencesFixed++;
        }
      }

      const summary = { paymentsChecked, subscriptionsChecked, divergencesFound, divergencesFixed };
      await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: { status: 'COMPLETED', ...summary, summary, finishedAt: new Date() },
      });

      await this.audit.log({
        actorId: actorId === 'SYSTEM' ? undefined : actorId,
        action: 'RECONCILIATION_RUN',
        entityType: 'RECONCILIATION',
        entityId: run.id,
        correlationId,
        metadata: summary,
      });

      return { status: 'COMPLETED', ...summary };
    } catch (error) {
      await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          summary: { error: error instanceof Error ? error.message : 'Erro' },
        },
      });
      throw error;
    } finally {
      this.running = false;
    }
  }

  async reconcileSubscription(id: string, actorId?: string, correlationId?: string) {
    const sub = await this.prisma.subscription.findUniqueOrThrow({ where: { id } });
    if (!sub.asaasSubscriptionId) return { updated: false };
    const remote = await this.provider.getSubscription(sub.asaasSubscriptionId);
    const mapped = mapAsaasSubscriptionToInternal(remote.status);
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: mapped,
        asaasStatus: remote.status,
        nextDueDate: remote.nextDueDate ? new Date(remote.nextDueDate) : sub.nextDueDate,
      },
    });
    await this.audit.log({
      actorId,
      action: 'SUBSCRIPTION_RECONCILED',
      entityType: 'SUBSCRIPTION',
      entityId: id,
      correlationId,
    });
    return { updated: true, subscription: updated };
  }
}
