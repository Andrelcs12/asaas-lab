import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { PaymentOrdersModule } from './payment-orders/payment-orders.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { AsaasModule } from './asaas/asaas.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { AppConfigService } from './common/config/app-config.service';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AsaasModule,
    AuthModule,
    CustomersModule,
    PaymentOrdersModule,
    PaymentsModule,
    SubscriptionsModule,
    WebhooksModule,
    ReconciliationModule,
    AdminModule,
    HealthModule,
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppModule {}
