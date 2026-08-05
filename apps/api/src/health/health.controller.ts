import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';
import { PaymentProvider } from '@asaas-lab/shared';
import { AppConfigService } from '../common/config/app-config.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
    private readonly config: AppConfigService,
  ) {}

  @Get()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('database')
  async database() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  }

  @Get('asaas')
  async asaas() {
    const connected = this.config.asaasApiKey ? await this.provider.healthCheck() : false;
    return {
      status: connected ? 'ok' : 'disconnected',
      environment: this.config.asaasEnvironment,
      configured: Boolean(this.config.asaasApiKey),
    };
  }
}
