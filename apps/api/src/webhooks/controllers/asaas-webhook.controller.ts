import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { WebhooksService } from '../webhooks.service';
import type { AsaasWebhookPayload } from '../types/asaas-webhook.types';

@ApiTags('webhooks')
@Controller('webhooks')
export class AsaasWebhookController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('asaas')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    }),
  )
  async receive(
    @Body() payload: AsaasWebhookPayload,
    @Headers('asaas-access-token') token?: string,
    @Res({ passthrough: true }) res?: FastifyReply,
  ) {
    const result = await this.webhooksService.receive(
      payload as unknown as Record<string, unknown>,
      token,
    );

    if (result.status === 401) {
      res?.status(401);
      return { received: false, error: 'Unauthorized' };
    }
    if (result.status === 400) {
      res?.status(400);
      return { received: false, error: 'Invalid payload' };
    }

    return { received: true, duplicate: result.duplicate ?? false };
  }
}
