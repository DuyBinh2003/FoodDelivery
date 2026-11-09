/**
 * @file idempotency-header.test.ts
 * @description Unit tests for Idempotency Header Injection & Mutation Protection
 * @trace docs/plans/platform/distributed-transaction-saga-outbox-and-idempotency.md (Issue #82)
 * @scenarios
 *   - Happy Path: Auto inject idempotency key on POST/PUT/PATCH, preserve custom keys
 *   - Edge Cases: Case-insensitive header check (idempotency-key vs Idempotency-Key vs x-idempotency-key)
 *   - Error Flow: Non-mutating methods (GET/DELETE/HEAD) should not inject idempotency key
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { injectIdempotencyHeader } from '../utils/saga.utils.ts';

describe('Frontend Idempotency Header Injection Suite (#82)', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG TIÊU CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Tự động inject header Idempotency-Key khi thực hiện request POST', () => {
      const result = injectIdempotencyHeader('POST', { 'Content-Type': 'application/json' }, () => 'uuid-1234-abcd');

      assert.strictEqual(result.injected, true);
      assert.strictEqual(result.key, 'uuid-1234-abcd');
      assert.strictEqual(result.headers['Idempotency-Key'], 'uuid-1234-abcd');
      assert.strictEqual(result.headers['Content-Type'], 'application/json');
    });

    it('HP-02: Tự động inject header Idempotency-Key khi thực hiện request PUT hoặc PATCH', () => {
      const putResult = injectIdempotencyHeader('PUT', {}, () => 'put-key-1');
      assert.strictEqual(putResult.injected, true);
      assert.strictEqual(putResult.headers['Idempotency-Key'], 'put-key-1');

      const patchResult = injectIdempotencyHeader('PATCH', {}, () => 'patch-key-2');
      assert.strictEqual(patchResult.injected, true);
      assert.strictEqual(patchResult.headers['Idempotency-Key'], 'patch-key-2');
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (BIÊN & GIỚI HẠN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Nếu request đã có sẵn header Idempotency-Key -> Không ghi đè (Preserve existing)', () => {
      const existingHeaders = {
        'Idempotency-Key': 'client-provided-key-999',
        Authorization: 'Bearer token',
      };
      const result = injectIdempotencyHeader('POST', existingHeaders, () => 'new-uuid');

      assert.strictEqual(result.injected, false);
      assert.strictEqual(result.headers['Idempotency-Key'], 'client-provided-key-999');
    });

    it('EC-02: Kiểm tra case-insensitive với x-idempotency-key viết thường', () => {
      const existingHeaders = {
        'x-idempotency-key': 'legacy-key-555',
      };
      const result = injectIdempotencyHeader('POST', existingHeaders, () => 'new-uuid');

      assert.strictEqual(result.injected, false);
      assert.strictEqual(result.headers['x-idempotency-key'], 'legacy-key-555');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Method GET không phải mutating request -> Tuyệt đối không inject Idempotency-Key', () => {
      const result = injectIdempotencyHeader('GET', { Accept: 'application/json' });

      assert.strictEqual(result.injected, false);
      assert.strictEqual(result.headers['Idempotency-Key'], undefined);
      assert.strictEqual(result.headers['Accept'], 'application/json');
    });

    it('ER-02: Method OPTIONS hoặc HEAD không được gắn header Idempotency-Key', () => {
      const optResult = injectIdempotencyHeader('OPTIONS', {});
      assert.strictEqual(optResult.injected, false);
      assert.strictEqual(optResult.headers['Idempotency-Key'], undefined);
    });
  });
});

