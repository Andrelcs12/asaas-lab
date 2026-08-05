import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AsaasWebhookService } from '../services/asaas-webhook.service';
import type { AsaasWebhookPayload } from '../types/asaas-webhook.types';

@ApiTags('webhooks')
@Controller('webhooks')
export class AsaasWebhookController {
  constructor(private readonly asaasWebhookService: AsaasWebhookService) {}

  @Post('asaas')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    }),
  )
  receive(
    @Body() payload: AsaasWebhookPayload,
    @Headers('asaas-access-token') token?: string,
  ) {
    return this.asaasWebhookService.receive(token, payload);
  }
}
