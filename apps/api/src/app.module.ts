import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
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
import { ProductsModule } from './products/products.module';
import { CheckoutsModule } from './checkouts/checkouts.module';
import { AppConfigModule } from './common/config/app-config.module';
import { validateEnv } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
    AppConfigModule,
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
    ProductsModule,
    CheckoutsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
