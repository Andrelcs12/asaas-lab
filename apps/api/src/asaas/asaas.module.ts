import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AsaasHttpClient } from './asaas-http.client';
import { AsaasPaymentProvider } from './asaas-payment.provider';
import { MockPaymentProvider } from './mock-payment.provider';
import { AppConfigService } from '../common/config/app-config.service';
import { PAYMENT_PROVIDER_TOKEN } from './payment-provider.token';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        baseURL: config.asaasBaseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AsaasPaymentLab/1.0.0',
        },
      }),
    }),
  ],
  providers: [
    AsaasHttpClient,
    AsaasPaymentProvider,
    MockPaymentProvider,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      inject: [AppConfigService, AsaasPaymentProvider, MockPaymentProvider],
      useFactory: (
        config: AppConfigService,
        asaas: AsaasPaymentProvider,
        mock: MockPaymentProvider,
      ) => (config.paymentProvider === 'mock' ? mock : asaas),
    },
  ],
  exports: [PAYMENT_PROVIDER_TOKEN, AsaasPaymentProvider, MockPaymentProvider],
})
export class AsaasModule {}
