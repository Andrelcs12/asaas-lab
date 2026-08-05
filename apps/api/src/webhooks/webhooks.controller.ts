import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('asaas')
  async receive(
    @Body() payload: Record<string, unknown>,
    @Headers('asaas-access-token') token?: string,
  ) {
    const result = await this.webhooksService.receive(payload, token);
    if (!result.ok) {
      return { statusCode: result.status };
    }
    return { received: true, duplicate: result.duplicate ?? false };
  }
}
