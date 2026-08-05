import { Module, forwardRef } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { PaymentsModule } from '../payments/payments.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [forwardRef(() => PaymentsModule), AsaasModule],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
