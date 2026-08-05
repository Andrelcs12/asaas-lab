import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { sanitizeForLog } from '@asaas-lab/shared';
import { AppConfigService } from '../common/config/app-config.service';

@Injectable()
export class AsaasHttpClient {
  private readonly logger = new Logger(AsaasHttpClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: AppConfigService,
  ) {}

  async request<T>(method: string, path: string, data?: unknown, correlationId?: string): Promise<T> {
    const start = Date.now();
    try {
      const response = await firstValueFrom(
        this.http.request<T>({
          method,
          url: path,
          data,
          headers: {
            access_token: this.config.asaasApiKey,
            'X-Correlation-Id': correlationId,
          },
        }),
      );

      this.logger.debug({
        correlationId,
        method,
        path,
        status: response.status,
        durationMs: Date.now() - start,
      });

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const responseData = sanitizeForLog(axiosError.response?.data);

      this.logger.error({
        correlationId,
        method,
        path,
        status,
        durationMs: Date.now() - start,
        error: responseData,
      });

      throw error;
    }
  }
}
