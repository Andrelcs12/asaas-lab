import { Module } from '@nestjs/common';
import { PaymentOrdersService } from './payment-orders.service';
import { PaymentOrdersController } from './payment-orders.controller';
import { CustomersModule } from '../customers/customers.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [CustomersModule, AsaasModule],
  controllers: [PaymentOrdersController],
  providers: [PaymentOrdersService],
  exports: [PaymentOrdersService],
})
export class PaymentOrdersModule {}
