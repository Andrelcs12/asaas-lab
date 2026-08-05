import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { InjectOptions, LightMyRequestResponse } from 'light-my-request';
import { HealthController } from '../src/health/health.controller';
import { AsaasWebhookController } from '../src/webhooks/controllers/asaas-webhook.controller';
import { AsaasWebhookService } from '../src/webhooks/services/asaas-webhook.service';
import { AppConfigService } from '../src/common/config/app-config.service';
import { PAYMENT_PROVIDER_TOKEN } from '../src/asaas/payment-provider.token';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

const WEBHOOK_TOKEN = 'test-webhook-token-local';

const mockConfig = {
  asaasEnv: 'sandbox',
  asaasWebhookAuthToken: WEBHOOK_TOKEN,
  webUrl: 'http://localhost:3000',
  port: 3001,
} as AppConfigService;

async function createTestApp(
  controllers: Array<typeof HealthController | typeof AsaasWebhookController>,
  providers: Parameters<typeof Test.createTestingModule>[0]['providers'] = [],
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers,
    providers: [
      ...providers,
      { provide: AppConfigService, useValue: mockConfig },
    ],
  }).compile();

  const app = moduleRef.createNestApplication(new FastifyAdapter());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

async function inject(
  app: NestFastifyApplication,
  options: InjectOptions,
): Promise<LightMyRequestResponse> {
  return app.getHttpAdapter().getInstance().inject(options);
}

describe('GET /health (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: AppConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: { $queryRaw: async () => [{ '?column?': 1 }] } },
        {
          provide: PAYMENT_PROVIDER_TOKEN,
          useValue: { healthCheck: async () => true },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication(new FastifyAdapter());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('retorna HTTP 200', async () => {
    const response = await inject(app, { method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      status: 'ok',
      service: 'asaas-simulator-api',
      environment: 'sandbox',
    });
    expect(body.timestamp).toBeTruthy();
  });
});

describe('POST /webhooks/asaas (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp([AsaasWebhookController], [AsaasWebhookService]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('sem token retorna HTTP 401', async () => {
    const response = await inject(app, {
      method: 'POST',
      url: '/webhooks/asaas',
      headers: { 'content-type': 'application/json' },
      payload: { id: 'evt_test_001', event: 'PAYMENT_CONFIRMED' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('com token errado retorna HTTP 401', async () => {
    const response = await inject(app, {
      method: 'POST',
      url: '/webhooks/asaas',
      headers: {
        'content-type': 'application/json',
        'asaas-access-token': 'token-invalido',
      },
      payload: { id: 'evt_test_001', event: 'PAYMENT_CONFIRMED' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('com token correto retorna HTTP 200', async () => {
    const response = await inject(app, {
      method: 'POST',
      url: '/webhooks/asaas',
      headers: {
        'content-type': 'application/json',
        'asaas-access-token': WEBHOOK_TOKEN,
      },
      payload: {
        id: 'evt_test_001',
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_001',
          subscription: 'sub_test_001',
          status: 'CONFIRMED',
          value: 99.9,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.statusCode).not.toBe(201);
    expect(response.json()).toEqual({ received: true, eventId: 'evt_test_001' });
  });

  it('aceita campos adicionais no payload', async () => {
    const response = await inject(app, {
      method: 'POST',
      url: '/webhooks/asaas',
      headers: {
        'content-type': 'application/json',
        'asaas-access-token': WEBHOOK_TOKEN,
      },
      payload: {
        id: 'evt_test_extra',
        event: 'PAYMENT_RECEIVED',
        novoCampoAsaas: 'valor-desconhecido',
        payment: { id: 'pay_extra', status: 'RECEIVED' },
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().eventId).toBe('evt_test_extra');
  });
});

describe('AsaasWebhookService — token não configurado', () => {
  let app: NestFastifyApplication;

  afterAll(async () => {
    await app?.close();
  });

  it('retorna HTTP 500 quando ASAAS_WEBHOOK_AUTH_TOKEN está ausente', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AsaasWebhookController],
      providers: [
        AsaasWebhookService,
        {
          provide: AppConfigService,
          useValue: { ...mockConfig, asaasWebhookAuthToken: '' },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication(new FastifyAdapter());
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const response = await inject(app, {
      method: 'POST',
      url: '/webhooks/asaas',
      headers: {
        'content-type': 'application/json',
        'asaas-access-token': 'qualquer-token',
      },
      payload: { id: 'evt_no_token', event: 'PAYMENT_CONFIRMED' },
    });

    expect(response.statusCode).toBe(500);
  });
});
