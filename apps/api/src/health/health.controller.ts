import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaymentProvider } from '@asaas-lab/shared';
import { AppConfigService } from '../common/config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER_TOKEN } from '../asaas/payment-provider.token';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
  ) {}

  @Get()
  health() {
    return {
      status: 'ok',
      service: 'asaas-simulator-api',
      environment: this.config.asaasEnv,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  async database() {
    if (!this.config.hasDatabase) {
      return {
        status: 'skipped',
        message: 'DATABASE_URL não configurada.',
        timestamp: new Date().toISOString(),
      };
    }

    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('asaas')
  async asaas() {
    const connected = await this.provider.healthCheck();

    if (!connected) {
      throw new ServiceUnavailableException({
        code: 'ASAAS_UNAVAILABLE',
        message: 'Não foi possível conectar ao Asaas.',
      });
    }

    return {
      status: 'ok',
      provider: this.config.paymentProvider,
      environment: this.config.asaasEnv,
      timestamp: new Date().toISOString(),
    };
  }
}
