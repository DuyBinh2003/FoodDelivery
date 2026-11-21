import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

export interface TracedRequest extends Request {
  traceId?: string;
}

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<TracedRequest>();
    const res = httpContext.getResponse<Response>();

    const incomingTraceId =
      (req.headers['x-trace-id'] as string | undefined) ||
      (req.headers['traceparent'] as string | undefined);

    const traceId =
      incomingTraceId && incomingTraceId.trim() !== ''
        ? incomingTraceId.trim()
        : `fd-tr-${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    req.traceId = traceId;
    req.headers['x-trace-id'] = traceId;

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('x-trace-id', traceId);
    }

    const startTime = Date.now();
    const method = req.method;
    const url = req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = res?.statusCode ?? 200;
          this.logger.log(`[${traceId}] ${method} ${url} ${statusCode} - ${duration}ms`);
        },
        error: (err: unknown) => {
          const duration = Date.now() - startTime;
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`[${traceId}] ${method} ${url} Failed after ${duration}ms: ${msg}`);
        },
      }),
    );
  }
}
