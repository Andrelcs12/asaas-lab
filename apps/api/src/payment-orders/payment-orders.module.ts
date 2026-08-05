import { Module } from '@nestjs/common';
import { PaymentOrdersService } from './payment-orders.service';
import { PaymentOrdersController } from './payment-orders.controller';
import { CustomersModule } from '../customers/customers.module';
import { AsaasModule } from '../asaas/asaas.module';
import { ProductsModule } from '../products/products.module';
import { CheckoutsModule } from '../checkouts/checkouts.module';

@Module({
  imports: [CustomersModule, AsaasModule, ProductsModule, CheckoutsModule],
  controllers: [PaymentOrdersController],
  providers: [PaymentOrdersService],
  exports: [PaymentOrdersService],
})
export class PaymentOrdersModule {}
