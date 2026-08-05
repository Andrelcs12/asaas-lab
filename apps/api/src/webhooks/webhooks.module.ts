import { Module } from '@nestjs/common';
import { AsaasWebhookController } from './controllers/asaas-webhook.controller';
import { AsaasWebhookService } from './services/asaas-webhook.service';
import { WebhooksService } from './webhooks.service';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentOrdersModule } from '../payment-orders/payment-orders.module';

@Module({
  imports: [PaymentsModule, PaymentOrdersModule],
  controllers: [AsaasWebhookController],
  providers: [AsaasWebhookService, WebhooksService],
  exports: [AsaasWebhookService, WebhooksService],
})
export class WebhooksModule {}
