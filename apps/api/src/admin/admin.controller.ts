import { Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { calculateDashboardTotals } from '@asaas-lab/shared';
import { InternalPaymentStatus, SubscriptionStatus, WebhookEventStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CorrelationId, CurrentUser, Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ReconciliationService } from '../reconciliation/reconciliation.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../common/config/app-config.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { PaymentProvider } from '@asaas-lab/shared';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
    private readonly reconciliationService: ReconciliationService,
    private readonly auditService: AuditService,
    private readonly config: AppConfigService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [
      customersCount,
      productsCount,
      checkoutsCount,
      payments,
      activeSubscriptions,
      pausedSubscriptions,
      canceledSubscriptions,
      pendingWebhooks,
      failedWebhooks,
      recentEvents,
      recentPayments,
      recentSubscriptions,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.product.count(),
      this.prisma.checkout.count(),
      this.prisma.payment.findMany({ select: { internalStatus: true, value: true, subscriptionId: true } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.PAUSED } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELED } }),
      this.prisma.webhookEvent.count({ where: { status: WebhookEventStatus.PENDING } }),
      this.prisma.webhookEvent.count({ where: { status: WebhookEventStatus.FAILED } }),
      this.prisma.webhookEvent.findMany({ take: 5, orderBy: { receivedAt: 'desc' } }),
      this.prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
      this.prisma.subscription.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } }, product: { select: { name: true } } },
      }),
    ]);

    const totals = calculateDashboardTotals(
      payments.map((p) => ({ internalStatus: p.internalStatus as never, value: Number(p.value) })),
    );

    const renewals = payments.filter((p) => p.subscriptionId).length;

    return {
      customersCount,
      productsCount,
      checkoutsCount,
      ...totals,
      activeSubscriptions,
      pausedSubscriptions,
      canceledSubscriptions,
      pendingWebhooks,
      failedWebhooks,
      renewals,
      recentEvents,
      recentPayments,
      recentSubscriptions,
    };
  }

  @Get('webhooks')
  @Roles(UserRole.ADMIN, UserRole.VIEWER)
  listWebhooks(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.webhooksService.findAll(Number(page), Number(limit));
  }

  @Get('webhooks/:id')
  @Roles(UserRole.ADMIN, UserRole.VIEWER)
  getWebhook(@Param('id') id: string) {
    return this.webhooksService.findOne(id);
  }

  @Post('webhooks/:id/reprocess')
  @Roles(UserRole.ADMIN)
  reprocessWebhook(@Param('id') id: string) {
    return this.webhooksService.reprocess(id);
  }

  @Get('audit')
  @Roles(UserRole.ADMIN, UserRole.VIEWER)
  async audit(@Query('page') page = '1', @Query('limit') limit = '20') {
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  @Post('reconciliation/run')
  @Roles(UserRole.ADMIN)
  runReconciliation(@CurrentUser('id') userId: string, @CorrelationId() correlationId: string) {
    return this.reconciliationService.run(userId, correlationId);
  }

  @Get('settings')
  async settings() {
    const connected = await this.provider.healthCheck();
    return {
      environment: this.config.asaasEnvironment,
      asaasBaseUrl: this.config.asaasBaseUrl,
      webhookConfigured: Boolean(this.config.asaasWebhookAuthToken),
      webhookUrl: this.config.asaasWebhookUrl,
      provider: this.config.paymentProvider,
      connectionStatus: connected ? 'connected' : 'disconnected',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  @Get('sandbox')
  @Roles(UserRole.ADMIN)
  async sandbox() {
    const [lastCheckouts, lastPayments, lastSubscriptions, lastWebhooks, lastCustomers] =
      await Promise.all([
        this.prisma.checkout.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
        this.prisma.payment.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
        this.prisma.subscription.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
        this.prisma.webhookEvent.findMany({ take: 5, orderBy: { receivedAt: 'desc' } }),
        this.prisma.customer.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, asaasCustomerId: true },
        }),
      ]);

    const connected = await this.provider.healthCheck();

    return {
      environment: this.config.asaasEnvironment,
      asaasBaseUrl: this.config.asaasBaseUrl,
      webhookConfigured: Boolean(this.config.asaasWebhookAuthToken),
      webhookUrl: this.config.asaasWebhookUrl,
      connectionStatus: connected ? 'connected' : 'disconnected',
      lastCheckouts,
      lastPayments,
      lastSubscriptions,
      lastWebhooks,
      lastCustomers,
    };
  }
}
