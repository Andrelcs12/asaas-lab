import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv() {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get apiPort() {
    return this.config.get<number>('API_PORT', 3333);
  }

  get apiUrl() {
    return this.config.get<string>('API_URL', 'http://localhost:3333');
  }

  get webUrl() {
    return this.config.get<string>('WEB_URL', 'http://localhost:3000');
  }

  get jwtSecret() {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  get jwtExpiresIn() {
    return this.config.get<string>('JWT_EXPIRES_IN', '8h');
  }

  get paymentProvider() {
    return this.config.get<string>('PAYMENT_PROVIDER', 'asaas');
  }

  get asaasEnvironment() {
    return this.config.get<string>('ASAAS_ENVIRONMENT', 'sandbox');
  }

  get asaasBaseUrl() {
    return this.config.getOrThrow<string>('ASAAS_BASE_URL');
  }

  get asaasApiKey() {
    return this.config.get<string>('ASAAS_API_KEY', '');
  }

  get asaasWebhookAuthToken() {
    return this.config.get<string>('ASAAS_WEBHOOK_AUTH_TOKEN', '');
  }

  get logLevel() {
    return this.config.get<string>('LOG_LEVEL', 'debug');
  }

  get isDevelopment() {
    return this.nodeEnv === 'development';
  }
}
