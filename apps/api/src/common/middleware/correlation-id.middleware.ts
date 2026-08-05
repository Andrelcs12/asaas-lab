import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest & { correlationId?: string }, _res: FastifyReply, next: () => void) {
    req.correlationId = (req.headers['x-correlation-id'] as string) ?? uuidv4();
    next();
  }
}
