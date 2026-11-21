import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorResponseBody {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  traceId?: string;
  errors?: unknown[];
  timestamp: string;
  path: string;
}

interface RequestWithTrace extends Request {
  traceId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithTrace>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.';
    let errors: unknown[] | undefined = undefined;

    // Resolve Trace ID from request property, headers, or response header
    const rawTraceId =
      request?.traceId ||
      (request?.headers?.['x-trace-id'] as string | undefined) ||
      (typeof response?.getHeader === 'function' ? (response.getHeader('x-trace-id') as string | undefined) : undefined);

    const traceId = rawTraceId && rawTraceId.trim() !== '' ? rawTraceId.trim() : undefined;

    if (traceId && response && typeof response.setHeader === 'function' && !response.headersSent) {
      response.setHeader('x-trace-id', traceId);
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errorCode = exception.name || 'HTTP_EXCEPTION';
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        errorCode =
          (resObj.errorCode as string) ||
          (resObj.error as string) ||
          exception.name;

        // Class-validator / ValidationPipe produces { message: string[], error: 'Bad Request' }
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('; ');
          errors = resObj.message;
          errorCode = 'VALIDATION_ERROR';
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      const tracePrefix = traceId ? `[${traceId}] ` : '';
      this.logger.error(
        `${tracePrefix}Unhandled Exception on ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''}: ${exception.message}`,
        exception.stack,
      );
      message = 'Hệ thống đang bận hoặc gặp sự cố xử lý. Vui lòng thử lại.';
      errorCode = 'UNHANDLED_EXCEPTION';
    } else {
      const tracePrefix = traceId ? `[${traceId}] ` : '';
      this.logger.error(
        `${tracePrefix}Unknown non-error exception on ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''}: ${String(exception)}`,
      );
    }

    const responseBody: ErrorResponseBody = {
      success: false,
      statusCode: status,
      errorCode,
      message,
      ...(traceId ? { traceId } : {}),
      ...(errors && errors.length > 0 ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request?.url ?? '',
    };

    if (response && typeof response.status === 'function') {
      response.status(status).json(responseBody);
    }
  }
}
