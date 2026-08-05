import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { CustomersModule } from '../customers/customers.module';
import { AsaasModule } from '../asaas/asaas.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { ProductsModule } from '../products/products.module';
import { CheckoutsModule } from '../checkouts/checkouts.module';

@Module({
  imports: [CustomersModule, AsaasModule, ReconciliationModule, ProductsModule, CheckoutsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
