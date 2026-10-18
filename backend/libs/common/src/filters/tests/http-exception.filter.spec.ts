/**
 * @file http-exception.filter.spec.ts
 * @description Kiểm thử bộ lọc ngoại lệ toàn cục GlobalExceptionFilter
 * @trace docs/architecture/error-handling.md
 * @plan error_handling_implementation_plan.md # Verification Plan
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import {
  GlobalExceptionFilter,
  type ErrorResponseBody,
} from '../http-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  let mockRequest: {
    url: string;
    method: string;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/orders',
      method: 'POST',
    };

    mockHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  // ==========================================
  // 1. HAPPY PATH (Ngoại lệ nghiệp vụ chuẩn)
  // ==========================================
  describe('Happy Path', () => {
    it('should format standard NotFoundException with custom message and path', () => {
      const exception = new NotFoundException('Không tìm thấy đơn hàng');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledOnce();

      const responsePayload = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;
      expect(responsePayload.success).toBe(false);
      expect(responsePayload.statusCode).toBe(404);
      expect(responsePayload.errorCode).toBe('Not Found');
      expect(responsePayload.message).toBe('Không tìm thấy đơn hàng');
      expect(responsePayload.path).toBe('/api/orders');
      expect(responsePayload.timestamp).toBeDefined();
    });

    it('should format ConflictException with business message', () => {
      const exception = new ConflictException('Tài khoản email đã tồn tại trong hệ thống');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      const responsePayload = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;
      expect(responsePayload.statusCode).toBe(409);
      expect(responsePayload.message).toBe('Tài khoản email đã tồn tại trong hệ thống');
      expect(responsePayload.errorCode).toBe('Conflict');
    });
  });

  // ==========================================
  // 2. EDGE CASES (Validation Pipe & Định dạng đặc biệt)
  // ==========================================
  describe('Edge Cases', () => {
    it('should handle ValidationPipe string array errors and map to VALIDATION_ERROR', () => {
      const validationMessages = [
        'email must be an email',
        'password must be longer than 8 characters',
      ];
      const exception = new BadRequestException({
        message: validationMessages,
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const responsePayload = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;
      expect(responsePayload.statusCode).toBe(400);
      expect(responsePayload.errorCode).toBe('VALIDATION_ERROR');
      expect(responsePayload.message).toBe(validationMessages.join('; '));
      expect(responsePayload.errors).toEqual(validationMessages);
    });

    it('should handle simple string response in HttpException', () => {
      const exception = new HttpException('Custom raw string message', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      const responsePayload = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;
      expect(responsePayload.statusCode).toBe(403);
      expect(responsePayload.message).toBe('Custom raw string message');
    });

    it('should gracefully handle missing or undefined request properties', () => {
      const emptyHost = {
        switchToHttp: vi.fn().mockReturnValue({
          getResponse: () => mockResponse,
          getRequest: () => ({}),
        }),
      } as unknown as ArgumentsHost;

      const exception = new NotFoundException('Not found');

      filter.catch(exception, emptyHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const responsePayload = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;
      expect(responsePayload.path).toBe('');
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (Crash & Lỗi máy chủ không xác định)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('should suppress sensitive database error details and return safe 500 response', () => {
      const rawDbError = new Error(
        'syntax error at or near "SELECT" in PostgreSQL internal connection',
      );

      filter.catch(rawDbError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const responsePayload = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;

      expect(responsePayload.success).toBe(false);
      expect(responsePayload.statusCode).toBe(500);
      expect(responsePayload.errorCode).toBe('UNHANDLED_EXCEPTION');
      // Must not leak PostgreSQL query details
      expect(responsePayload.message).not.toContain('syntax error at or near');
      expect(responsePayload.message).toBe(
        'Hệ thống đang bận hoặc gặp sự cố xử lý. Vui lòng thử lại.',
      );
    });

    it('should handle non-Error unknown thrown objects safely', () => {
      filter.catch('Unexpected string thrown', mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const responsePayload = mockResponse.json.mock.calls[0][0] as ErrorResponseBody;
      expect(responsePayload.statusCode).toBe(500);
      expect(responsePayload.errorCode).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});
