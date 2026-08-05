import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get nodeEnv() {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  /** PORT (Vercel) → API_PORT (legado) → 3001 */
  get port() {
    const raw = this.config.get<string>('PORT') ?? this.config.get<string>('API_PORT') ?? '3001';
    return Number.parseInt(raw, 10);
  }

  /** @deprecated use port */
  get apiPort() {
    return this.port;
  }

  get apiUrl() {
    return this.config.get<string>('API_URL', `http://localhost:${this.port}`);
  }

  get webUrl() {
    return this.config.get<string>('WEB_URL', 'http://localhost:3000');
  }

  get jwtSecret() {
    return this.config.get<string>('JWT_SECRET', 'local-dev-only-change-me');
  }

  get jwtExpiresIn() {
    return this.config.get<string>('JWT_EXPIRES_IN', '8h');
  }

  get paymentProvider() {
    return this.config.get<string>('PAYMENT_PROVIDER', 'asaas');
  }

  get asaasEnv() {
    return (
      this.config.get<string>('ASAAS_ENV') ??
      this.config.get<string>('ASAAS_ENVIRONMENT', 'sandbox')
    );
  }

  /** @deprecated use asaasEnv */
  get asaasEnvironment() {
    return this.asaasEnv;
  }

  get asaasApiUrl() {
    return (
      this.config.get<string>('ASAAS_API_URL') ??
      this.config.get<string>('ASAAS_BASE_URL', 'https://api-sandbox.asaas.com/v3')
    );
  }

  /** @deprecated use asaasApiUrl */
  get asaasBaseUrl() {
    return this.asaasApiUrl;
  }

  get asaasApiKey() {
    return this.config.get<string>('ASAAS_API_KEY', '');
  }

  get asaasWebhookAuthToken() {
    return this.config.get<string>('ASAAS_WEBHOOK_AUTH_TOKEN', '');
  }

  get asaasWebhookUrl() {
    return this.config.get<string>('ASAAS_WEBHOOK_URL', '');
  }

  get databaseUrl() {
    return this.config.get<string>('DATABASE_URL', '');
  }

  get hasDatabase() {
    return Boolean(this.databaseUrl);
  }

  get logLevel() {
    return this.config.get<string>('LOG_LEVEL', 'debug');
  }

  get isDevelopment() {
    return this.nodeEnv === 'development';
  }

  get isVercel() {
    return Boolean(process.env.VERCEL);
  }
}
