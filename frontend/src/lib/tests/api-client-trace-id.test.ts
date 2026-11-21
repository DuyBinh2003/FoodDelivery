/**
 * @file api-client-trace-id.test.ts
 * @description Kiểm thử trích xuất và hiển thị Trace ID trên ApiError từ API phản hồi lỗi
 * @trace docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md
 * @plan docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md # Testing Policy Compliance
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractTraceId } from '../trace-utils.ts';

// Lightweight ApiError mirroring client class for isolated unit test
class TestApiError extends Error {
  public status: number;
  public errorCode?: string;
  public traceId?: string;

  constructor(status: number, message: string, options?: { errorCode?: string; traceId?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = options?.errorCode;
    this.traceId = options?.traceId;
  }
}

describe('apiClient & ApiError Distributed Trace ID [Issue #89 APM Tracing]', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Trích xuất traceId từ header x-trace-id khi server trả về lỗi 500', () => {
      const mockTraceId = 'fd-tr-9a8b7c6d5e4f';
      const mockHeaders = new Headers({
        'x-trace-id': mockTraceId,
      });

      const extracted = extractTraceId(mockHeaders, {
        traceId: undefined,
      });

      assert.strictEqual(extracted, mockTraceId);

      const err = new TestApiError(500, 'Hệ thống đang bận', { traceId: extracted });
      assert.strictEqual(err.status, 500);
      assert.strictEqual(err.traceId, mockTraceId);
    });

    it('2. Trích xuất traceparent khi server sử dụng chuẩn W3C Distributed Tracing', () => {
      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const mockHeaders = new Headers({
        traceparent,
      });

      const extracted = extractTraceId(mockHeaders);
      assert.strictEqual(extracted, traceparent);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (TRƯỜNG HỢP BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('3. Trích xuất traceId từ payload body khi header bị proxy gateway ẩn', () => {
      const bodyTraceId = 'fd-tr-body-112233';
      const extracted = extractTraceId(new Headers(), {
        traceId: bodyTraceId,
      });

      assert.strictEqual(extracted, bodyTraceId);

      const err = new TestApiError(400, 'Dữ liệu không hợp lệ', { traceId: extracted });
      assert.strictEqual(err.status, 400);
      assert.strictEqual(err.traceId, bodyTraceId);
    });

    it('4. Hỗ trợ headers dạng Plain Object Record<string, string>', () => {
      const plainHeaders = { 'x-trace-id': 'fd-tr-plain-obj-9988' };
      const extracted = extractTraceId(plainHeaders);
      assert.strictEqual(extracted, 'fd-tr-plain-obj-9988');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('5. Khi phản hồi không chứa bất kỳ traceId nào, trả về undefined mà không crash runtime', () => {
      const extracted = extractTraceId(null, null);
      assert.strictEqual(extracted, undefined);

      const err = new TestApiError(404, 'Không tìm thấy', { traceId: extracted });
      assert.strictEqual(err.status, 404);
      assert.strictEqual(err.traceId, undefined);
    });
  });
});
