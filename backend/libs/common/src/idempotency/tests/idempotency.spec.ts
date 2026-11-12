/**
 * @requirement Issue #82 - Distributed Transaction, Saga Orchestration & Idempotency Engine
 * @scenario Two-Tier Idempotency Engine Suite (3-Branch Testing)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ConflictException, BadRequestException, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { IdempotencyService } from '@/common/idempotency/idempotency.service.js';
import { IdempotencyInterceptor } from '@/common/idempotency/idempotency.interceptor.js';

describe('Two-Tier Idempotency Engine Suite (#82)', () => {
  let idempotencyService: IdempotencyService;
  let interceptor: IdempotencyInterceptor;

  beforeEach(() => {
    idempotencyService = new IdempotencyService();
    interceptor = new IdempotencyInterceptor(idempotencyService);
  });

  const createMockContext = (headers: Record<string, string | undefined>) => {
    const responseHeaders: Record<string, string> = {};
    let responseStatus = 200;

    const request = { headers, method: 'POST' };
    const response = {
      setHeader: vi.fn((key: string, value: string) => {
        responseHeaders[key] = value;
      }),
      status: vi.fn((code: number) => {
        responseStatus = code;
      }),
      get statusCode() {
        return responseStatus;
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;

    return { context, request, response, responseHeaders };
  };

  describe('🟢 Nhánh 1: Happy Path', () => {
    it('HP-01: Gửi request lần đầu thành công -> Lấy lock và lưu cache response', async () => {
      /**
       * @requirement Issue #82
       * @scenario Request đầu tiên với idempotency-key hợp lệ
       * @expected Giành được lock, xử lý và lưu cached response
       */
      const { context } = createMockContext({ 'idempotency-key': 'txn-order-001' });
      const nextHandler: CallHandler = {
        handle: () => of({ success: true, orderId: 'ord-123' }),
      };

      const observable = await interceptor.intercept(context, nextHandler);
      let emittedData: unknown = null;
      observable.subscribe((data) => {
        emittedData = data;
      });

      expect(emittedData).toEqual({ success: true, orderId: 'ord-123' });

      // Kiểm tra cache đã được lưu
      const cached = await idempotencyService.getCachedResponse('txn-order-001');
      expect(cached).toBeDefined();
      expect(cached?.statusCode).toBe(200);
      expect(cached?.body).toEqual({ success: true, orderId: 'ord-123' });
    });

    it('HP-02: Gửi request lần hai với cùng key -> Trả về cached response (Replay Hit)', async () => {
      /**
       * @requirement Issue #82
       * @scenario Replay request với cùng idempotency-key đã hoàn tất
       * @expected Trả về cached response tức thì, set header X-Idempotent-Replay và X-Cache-Lookup
       */
      await idempotencyService.saveResponse('txn-order-002', 201, { orderId: 'ord-999' });

      const { context, response, responseHeaders } = createMockContext({
        'idempotency-key': 'txn-order-002',
      });
      const nextHandler: CallHandler = {
        handle: vi.fn(() => of({ orderId: 'different-order' })),
      };

      const observable = await interceptor.intercept(context, nextHandler);
      let emittedData: unknown = null;
      observable.subscribe((data) => {
        emittedData = data;
      });

      expect(emittedData).toEqual({ orderId: 'ord-999' });
      expect(nextHandler.handle).not.toHaveBeenCalled();
      expect(responseHeaders['X-Idempotent-Replay']).toBe('true');
      expect(responseHeaders['X-Cache-Lookup']).toBe('HIT');
      expect(response.status).toHaveBeenCalledWith(201);
    });

    it('HP-03: Request không truyền Idempotency-Key -> Bỏ qua và thực thi bình thường', async () => {
      /**
       * @requirement Issue #82
       * @scenario Không có header Idempotency-Key
       * @expected Bỏ qua kiểm tra, gọi next.handle()
       */
      const { context } = createMockContext({});
      const nextHandler: CallHandler = {
        handle: vi.fn(() => of({ status: 'ok' })),
      };

      const observable = await interceptor.intercept(context, nextHandler);
      let emittedData: unknown = null;
      observable.subscribe((data) => {
        emittedData = data;
      });

      expect(emittedData).toEqual({ status: 'ok' });
      expect(nextHandler.handle).toHaveBeenCalled();
    });
  });

  describe('🟡 Nhánh 2: Edge Cases', () => {
    it('EC-01: Hai request gửi đồng thời cùng 1 mili-giây -> Request thứ 2 nhận 409 Conflict', async () => {
      /**
       * @requirement Issue #82
       * @scenario Concurrent execution của cùng một key
       * @expected Request đầu thành công lấy lock, request sau ném 409 ConflictException
       */
      const key = 'concurrent-key-101';
      const acquire1 = await idempotencyService.acquireLock(key);
      expect(acquire1.acquired).toBe(true);

      const { context } = createMockContext({ 'idempotency-key': key });
      const nextHandler: CallHandler = {
        handle: () => of({ done: true }),
      };

      await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow(ConflictException);
    });

    it('EC-02: Key có khoảng trắng ở đầu và cuối -> Tự động trim sạch và xử lý hợp lệ', async () => {
      /**
       * @requirement Issue #82
       * @scenario Key có leading/trailing whitespaces
       * @expected Trim thành công và lưu đúng key sạch
       */
      const { context } = createMockContext({ 'idempotency-key': '   clean-key-202   ' });
      const nextHandler: CallHandler = {
        handle: () => of({ status: 'trimmed' }),
      };

      const observable = await interceptor.intercept(context, nextHandler);
      observable.subscribe();

      const cached = await idempotencyService.getCachedResponse('clean-key-202');
      expect(cached).toBeDefined();
      expect(cached?.body).toEqual({ status: 'trimmed' });
    });
  });

  describe('🔴 Nhánh 3: Error & Rejection Flow', () => {
    it('ER-01: Key rỗng hoặc chỉ toàn khoảng trắng -> Ném 400 BadRequestException', async () => {
      /**
       * @requirement Issue #82
       * @scenario Key là chuỗi rỗng
       * @expected Ném BadRequestException
       */
      const { context } = createMockContext({ 'idempotency-key': '   ' });
      const nextHandler: CallHandler = {
        handle: () => of({}),
      };

      await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow(BadRequestException);
    });

    it('ER-02: Key vượt quá độ dài tối đa cho phép (128 ký tự) -> Ném 400 BadRequestException', async () => {
      /**
       * @requirement Issue #82
       * @scenario Key dài 130 ký tự
       * @expected Ném BadRequestException
       */
      const longKey = 'a'.repeat(130);
      const { context } = createMockContext({ 'idempotency-key': longKey });
      const nextHandler: CallHandler = {
        handle: () => of({}),
      };

      await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow(BadRequestException);
    });

    it('ER-03: Khi Handler ném exception -> Tự động giải phóng lock để cho phép retry', async () => {
      /**
       * @requirement Issue #82
       * @scenario Handler nghiệp vụ ném lỗi (ví dụ DB error)
       * @expected Bắt lỗi, giải phóng lock và không lưu cache sai
       */
      const key = 'failing-request-key';
      const { context } = createMockContext({ 'idempotency-key': key });
      const nextHandler: CallHandler = {
        handle: () => throwError(() => new Error('DB Connection Timeout')),
      };

      const observable = await interceptor.intercept(context, nextHandler);

      await new Promise<void>((resolve) => {
        observable.subscribe({
          error: (err) => {
            expect(err.message).toBe('DB Connection Timeout');
            resolve();
          },
        });
      });

      // Kiểm tra lock đã được release, cho phép acquire lại
      const reacquire = await idempotencyService.acquireLock(key);
      expect(reacquire.acquired).toBe(true);
    });
  });
});

