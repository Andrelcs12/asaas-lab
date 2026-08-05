import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AsaasModule } from '../asaas/asaas.module';
import { ReconciliationModule } from '../reconciliation/reconciliation.module';

@Module({
  imports: [AsaasModule, forwardRef(() => ReconciliationModule)],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
