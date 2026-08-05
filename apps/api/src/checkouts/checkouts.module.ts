import { Module } from '@nestjs/common';
import { AsaasModule } from '../asaas/asaas.module';
import { CheckoutsController } from './checkouts.controller';
import { CheckoutsService } from './checkouts.service';

@Module({
  imports: [AsaasModule],
  controllers: [CheckoutsController],
  providers: [CheckoutsService],
  exports: [CheckoutsService],
})
export class CheckoutsModule {}
