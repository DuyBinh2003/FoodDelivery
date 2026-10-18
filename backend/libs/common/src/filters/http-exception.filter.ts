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
  errors?: unknown[];
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.';
    let errors: unknown[] | undefined = undefined;

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
      this.logger.error(
        `Unhandled Exception on ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''}: ${exception.message}`,
        exception.stack,
      );
      message = 'Hệ thống đang bận hoặc gặp sự cố xử lý. Vui lòng thử lại.';
      errorCode = 'UNHANDLED_EXCEPTION';
    } else {
      this.logger.error(
        `Unknown non-error exception on ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''}: ${String(exception)}`,
      );
    }

    const responseBody: ErrorResponseBody = {
      success: false,
      statusCode: status,
      errorCode,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request?.url ?? '',
    };

    if (response && typeof response.status === 'function') {
      response.status(status).json(responseBody);
    }
  }
}
