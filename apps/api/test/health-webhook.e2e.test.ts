import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { InjectOptions, LightMyRequestResponse } from 'light-my-request';
import { HealthController } from '../src/health/health.controller';
import { AsaasWebhookController } from '../src/webhooks/controllers/asaas-webhook.controller';
import { WebhooksService } from '../src/webhooks/webhooks.service';
import { AppConfigService } from '../src/common/config/app-config.service';
import { PAYMENT_PROVIDER_TOKEN } from '../src/asaas/payment-provider.token';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentsService } from '../src/payments/payments.service';
import { PaymentOrdersService } from '../src/payment-orders/payment-orders.service';
import { CheckoutsService } from '../src/checkouts/checkouts.service';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

const WEBHOOK_TOKEN = 'test-webhook-token-local';

function createMockConfig(overrides: Partial<AppConfigService> = {}) {
  return {
    asaasEnv: 'sandbox',
    asaasWebhookAuthToken: WEBHOOK_TOKEN,
    webUrl: 'http://localhost:3000',
    port: 3001,
    hasDatabase: true,
    ...overrides,
  } as AppConfigService;
}

const mockPrisma = {
  webhookEvent: {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'evt-local-1' }),
  },
};

async function createTestApp(
  controllers: Array<typeof HealthController | typeof AsaasWebhookController>,
  config = createMockConfig(),
): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers,
    providers: [
      WebhooksService,
      { provide: AppConfigService, useValue: config },
      { provide: PrismaService, useValue: mockPrisma },
      { provide: PaymentsService, useValue: { upsertFromWebhook: vi.fn() } },
      { provide: PaymentOrdersService, useValue: { findByExternalReference: vi.fn() } },
      { provide: CheckoutsService, useValue: { handleCheckoutEvent: vi.fn() } },
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
        { provide: AppConfigService, useValue: createMockConfig() },
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
    app = await createTestApp([AsaasWebhookController]);
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

  it('com token correto persiste evento e retorna HTTP 200', async () => {
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
    expect(response.json()).toEqual({ received: true, duplicate: false });
    expect(mockPrisma.webhookEvent.create).toHaveBeenCalled();
  });

  it('evento duplicado retorna 200 sem recriar', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValueOnce({ id: 'existing' });
    const response = await inject(app, {
      method: 'POST',
      url: '/webhooks/asaas',
      headers: {
        'content-type': 'application/json',
        'asaas-access-token': WEBHOOK_TOKEN,
      },
      payload: {
        id: 'evt_test_dup',
        event: 'PAYMENT_RECEIVED',
        payment: { id: 'pay_extra', status: 'RECEIVED' },
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true, duplicate: true });
  });
});

describe('POST /webhooks/asaas — token não configurado', () => {
  let app: NestFastifyApplication;

  afterAll(async () => {
    await app?.close();
  });

  it('retorna HTTP 401 quando ASAAS_WEBHOOK_AUTH_TOKEN está ausente', async () => {
    app = await createTestApp([AsaasWebhookController], createMockConfig({ asaasWebhookAuthToken: '' }));

    const response = await inject(app, {
      method: 'POST',
      url: '/webhooks/asaas',
      headers: {
        'content-type': 'application/json',
        'asaas-access-token': 'qualquer-token',
      },
      payload: { id: 'evt_no_token', event: 'PAYMENT_CONFIRMED' },
    });

    expect(response.statusCode).toBe(401);
  });
});
