/**
 * @file tracing.interceptor.spec.ts
 * @description Kiểm thử TracingInterceptor cấp phát và lưu vết x-trace-id xuyên suốt request
 * @trace docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md
 * @plan docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md # Testing Policy Compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TracingInterceptor, type TracedRequest } from '@/common/interceptors/tracing.interceptor.js';

describe('TracingInterceptor [Issue #89 Distributed APM]', () => {
  let interceptor: TracingInterceptor;
  let mockRequest: Partial<TracedRequest>;
  let mockResponse: {
    setHeader: ReturnType<typeof vi.fn>;
    statusCode: number;
  };
  let mockContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new TracingInterceptor();

    mockRequest = {
      headers: {},
      method: 'POST',
      url: '/orders',
    };

    mockResponse = {
      setHeader: vi.fn(),
      statusCode: 201,
    };

    mockContext = {
      getType: vi.fn().mockReturnValue('http'),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;
  });

  describe('Nhánh 1: Happy Path (Tự động sinh và lưu vết x-trace-id)', () => {
    it('[Requirement/Issue #89] [Branch: Happy] Tự động sinh traceId có tiền tố fd-tr- khi request chưa có trace-id', async () => {
      const next: CallHandler = {
        handle: () => of({ success: true, orderId: 'ord-123' }),
      };

      const observable = interceptor.intercept(mockContext, next);

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (res) => {
            expect(res).toEqual({ success: true, orderId: 'ord-123' });
            expect(mockRequest.traceId).toMatch(/^fd-tr-[a-f0-9]{12}$/);
            expect(mockRequest.headers?.['x-trace-id']).toBe(mockRequest.traceId);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-trace-id', mockRequest.traceId);
            resolve();
          },
        });
      });
    });

    it('[Requirement/Issue #89] [Branch: Happy] Kế thừa và forward x-trace-id có sẵn từ client/gateway', async () => {
      const existingTraceId = 'fd-tr-client-998877';
      mockRequest.headers = { 'x-trace-id': existingTraceId };

      const next: CallHandler = {
        handle: () => of({ status: 'ok' }),
      };

      const observable = interceptor.intercept(mockContext, next);

      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: () => {
            expect(mockRequest.traceId).toBe(existingTraceId);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-trace-id', existingTraceId);
            resolve();
          },
        });
      });
    });
  });

  describe('Nhánh 2: Edge Cases (Không phải HTTP context & traceparent format)', () => {
    it('[Requirement/Issue #89] [Branch: Edge] Bỏ qua khi context không phải là http (vd: RPC hoặc WebSocket)', async () => {
      (mockContext.getType as ReturnType<typeof vi.fn>).mockReturnValue('ws');

      const next: CallHandler = {
        handle: () => of({ event: 'ping' }),
      };

      const observable = interceptor.intercept(mockContext, next);
      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: (val) => {
            expect(val).toEqual({ event: 'ping' });
            expect(mockResponse.setHeader).not.toHaveBeenCalled();
            resolve();
          },
        });
      });
    });

    it('[Requirement/Issue #89] [Branch: Edge] Đọc traceparent khi không có x-trace-id', async () => {
      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      mockRequest.headers = { traceparent };

      const next: CallHandler = {
        handle: () => of('ok'),
      };

      const observable = interceptor.intercept(mockContext, next);
      await new Promise<void>((resolve) => {
        observable.subscribe({
          next: () => {
            expect(mockRequest.traceId).toBe(traceparent);
            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-trace-id', traceparent);
            resolve();
          },
        });
      });
    });
  });

  describe('Nhánh 3: Error & Rejection Flow (Gắn trace-id khi downstream xử lý ném ngoại lệ)', () => {
    it('[Requirement/Issue #89] [Branch: Error] Vẫn đính kèm x-trace-id vào response và request khi luồng downstream gặp lỗi', async () => {
      const error = new Error('Database connection timeout');
      const next: CallHandler = {
        handle: () => throwError(() => error),
      };

      const observable = interceptor.intercept(mockContext, next);

      await new Promise<void>((resolve) => {
        observable.subscribe({
          error: (err) => {
            expect(err).toBe(error);
            expect(mockRequest.traceId).toBeDefined();
            expect(mockResponse.setHeader).toHaveBeenCalledWith('x-trace-id', mockRequest.traceId);
            resolve();
          },
        });
      });
    });
  });
});
