import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ERROR_CODES } from '../constants/error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest & { correlationId?: string }>();

    const correlationId = request.correlationId ?? 'unknown';
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Erro interno do servidor.';
    let details: unknown[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        code = (obj.code as string) ?? code;
        message = (obj.message as string) ?? exception.message;
        details = obj.details as unknown[] | undefined;
      } else {
        message = String(body);
      }
    }

    if (statusCode === HttpStatus.BAD_REQUEST && code === 'INTERNAL_ERROR') {
      code = ERROR_CODES.VALIDATION_ERROR;
    }

    this.logger.error({
      correlationId,
      statusCode,
      code,
      message,
      path: request.url,
    });

    response.status(statusCode).send({
      statusCode,
      code,
      message,
      correlationId,
      details,
    });
  }
}
