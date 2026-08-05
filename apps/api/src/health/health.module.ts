import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [AsaasModule],
  controllers: [HealthController],
})
export class HealthModule {}
