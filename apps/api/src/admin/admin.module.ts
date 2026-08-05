import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [WebhooksModule, ReconciliationModule, AsaasModule],
  controllers: [AdminController],
})
export class AdminModule {}
