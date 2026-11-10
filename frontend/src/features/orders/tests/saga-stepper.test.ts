/**
 * @file saga-stepper.test.ts
 * @description Unit tests for Order Saga Stepper & Compensating Rollback Calculations
 * @trace docs/plans/platform/distributed-transaction-saga-outbox-and-idempotency.md (Issue #82)
 * @scenarios
 *   - Happy Path: Calculate active, completed and pending steps in Saga pipeline
 *   - Edge Cases: Transition boundaries, zero refund formatting
 *   - Error Flow: Failed step calculation with compensating alert message
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSagaStepStatus, formatSagaRefundSummary } from '../utils/saga.utils.ts';

describe('Order Saga Stepper & Rollback Calculation Suite (#82)', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG TIÊU CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Tại bước DEDUCT_PAYMENT -> CREATE_ORDER là completed, DEDUCT_PAYMENT là in_progress, DISPATCH_DRIVER là pending', () => {
      const step1Status = calculateSagaStepStatus('CREATE_ORDER', 'DEDUCT_PAYMENT', false);
      const step2Status = calculateSagaStepStatus('DEDUCT_PAYMENT', 'DEDUCT_PAYMENT', false);
      const step3Status = calculateSagaStepStatus('DISPATCH_DRIVER', 'DEDUCT_PAYMENT', false);

      assert.strictEqual(step1Status, 'completed');
      assert.strictEqual(step2Status, 'in_progress');
      assert.strictEqual(step3Status, 'pending');
    });

    it('HP-02: Định dạng bảng bồi hoàn tài chính (Refund Summary) chính xác theo VND và điểm thưởng', () => {
      const summary = formatSagaRefundSummary(150000, 200);

      assert.strictEqual(summary.hasRefund, true);
      assert.strictEqual(summary.formattedMoney, '150.000 VND');
      assert.strictEqual(summary.formattedPoints, '+200 điểm');
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (BIÊN & GIỚI HẠN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Đơn hàng không có tiền hoàn (ví dụ đơn CASH không dùng điểm) -> hasRefund = false', () => {
      const summary = formatSagaRefundSummary(0, 0);

      assert.strictEqual(summary.hasRefund, false);
      assert.strictEqual(summary.formattedMoney, '0 VND');
      assert.strictEqual(summary.formattedPoints, '0 điểm');
    });

    it('EC-02: Chỉ hoàn điểm loyalty không hoàn tiền -> hasRefund = true', () => {
      const summary = formatSagaRefundSummary(0, 500);

      assert.strictEqual(summary.hasRefund, true);
      assert.strictEqual(summary.formattedMoney, '0 VND');
      assert.strictEqual(summary.formattedPoints, '+500 điểm');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Khi bước hiện tại bị thất bại (isFailed = true) -> Trạng thái bước chuyển sang failed', () => {
      const failedStepStatus = calculateSagaStepStatus('DISPATCH_DRIVER', 'DISPATCH_DRIVER', true);
      assert.strictEqual(failedStepStatus, 'failed');

      // Các bước trước đó vẫn là completed
      const priorStepStatus = calculateSagaStepStatus('CREATE_ORDER', 'DISPATCH_DRIVER', true);
      assert.strictEqual(priorStepStatus, 'completed');
    });

    it('ER-02: Thất bại ngay tại bước đầu tiên (CREATE_ORDER) -> Bước 1 là failed, các bước sau vẫn pending', () => {
      const step1Status = calculateSagaStepStatus('CREATE_ORDER', 'CREATE_ORDER', true);
      const step2Status = calculateSagaStepStatus('DEDUCT_PAYMENT', 'CREATE_ORDER', true);

      assert.strictEqual(step1Status, 'failed');
      assert.strictEqual(step2Status, 'pending');
    });
  });
});

