import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { AppConfigService } from '../../common/config/app-config.service';
import type {
  AsaasWebhookPayload,
  AsaasWebhookReceiveResult,
  AsaasWebhookSafeLog,
} from '../types/asaas-webhook.types';

@Injectable()
export class AsaasWebhookService {
  private readonly logger = new Logger(AsaasWebhookService.name);

  constructor(private readonly config: AppConfigService) {}

  receive(token: string | undefined, payload: AsaasWebhookPayload): AsaasWebhookReceiveResult {
    this.assertWebhookTokenConfigured();
    this.assertValidToken(token);

    const eventId = String(payload.id ?? '');
    const event = String(payload.event ?? '');

    if (!eventId || !event) {
      throw new BadRequestException({
        code: 'WEBHOOK_INVALID_PAYLOAD',
        message: 'Payload do webhook inválido.',
      });
    }

    const safeLog = this.buildSafeLog(payload, eventId, event);
    this.logger.log(safeLog);

    // TODO: Persistir payload.id (asaasEventId) no PostgreSQL com índice UNIQUE
    // para idempotência durável. Memória de função serverless não é persistente.
    // Próxima fase: prisma.webhookEvent.create({ data: { asaasEventId: eventId, ... } })

    return { received: true, eventId };
  }

  private assertWebhookTokenConfigured(): void {
    if (!this.config.asaasWebhookAuthToken) {
      throw new InternalServerErrorException({
        code: 'WEBHOOK_TOKEN_NOT_CONFIGURED',
        message: 'ASAAS_WEBHOOK_AUTH_TOKEN não está configurado no servidor.',
      });
    }
  }

  private assertValidToken(token: string | undefined): void {
    const expected = this.config.asaasWebhookAuthToken;
    if (!token || !expected) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_UNAUTHORIZED',
        message: 'Token de webhook ausente ou inválido.',
      });
    }

    const received = Buffer.from(token);
    const configured = Buffer.from(expected);

    if (received.length !== configured.length || !timingSafeEqual(received, configured)) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_UNAUTHORIZED',
        message: 'Token de webhook ausente ou inválido.',
      });
    }
  }

  private buildSafeLog(
    payload: AsaasWebhookPayload,
    eventId: string,
    event: string,
  ): AsaasWebhookSafeLog {
    const payment = payload.payment;
    const subscription = payload.subscription;

    return {
      eventId,
      event,
      paymentId: payment?.id ? String(payment.id) : undefined,
      subscriptionId: payment?.subscription
        ? String(payment.subscription)
        : subscription?.id
          ? String(subscription.id)
          : undefined,
      paymentStatus: payment?.status ? String(payment.status) : undefined,
      receivedAt: new Date().toISOString(),
    };
  }
}
