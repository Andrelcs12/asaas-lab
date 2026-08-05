import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AsaasModule } from '../asaas/asaas.module';

@Module({
  imports: [PrismaModule, AsaasModule],
  controllers: [HealthController],
})
export class HealthModule {}
