import { Module } from '@nestjs/common';
import { AsaasWebhookController } from './controllers/asaas-webhook.controller';
import { WebhooksService } from './webhooks.service';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentOrdersModule } from '../payment-orders/payment-orders.module';
import { CheckoutsModule } from '../checkouts/checkouts.module';

@Module({
  imports: [PaymentsModule, PaymentOrdersModule, CheckoutsModule],
  controllers: [AsaasWebhookController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
