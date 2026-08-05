import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { AsaasWebhookService } from './asaas-webhook.service';
import { AppConfigService } from '../../common/config/app-config.service';

describe('AsaasWebhookService', () => {
  const config = {
    asaasWebhookAuthToken: 'local-test-token',
  } as AppConfigService;

  it('não registra secrets nos logs', () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log');
    const service = new AsaasWebhookService(config);

    service.receive('local-test-token', {
      id: 'evt_log_test',
      event: 'PAYMENT_CONFIRMED',
      payment: { id: 'pay_1', status: 'CONFIRMED' },
    });

    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain('local-test-token');
    expect(logged).not.toContain('ASAAS_API_KEY');
    logSpy.mockRestore();
  });
});
