/**
 * @file dispute-resolution.test.ts
 * @description Unit tests for Customer Support Dispute Reporting and Resolution Validation logic
 * @traceability
 *   - Plan: docs/plans/admin/customer-support-dispute-and-order-intervention.md (Issue #33 / #A2)
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface DisputeInput {
  orderId: string;
  reasonCode: string;
  description: string;
  evidenceImages?: string[];
}

export interface DisputeResolutionInput {
  action: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'REJECT';
  orderTotal: number;
  customAmount?: number;
  penaltyParty?: 'RESTAURANT' | 'DRIVER' | 'PLATFORM';
}

export function validateDisputeInput(input: DisputeInput): { isValid: boolean; error?: string } {
  if (!input.orderId?.trim()) {
    return { isValid: false, error: 'Mã đơn hàng không được để trống' };
  }

  const validReasons = ['DAMAGED_FOOD', 'WRONG_ITEMS', 'NEVER_ARRIVED', 'RUDE_BEHAVIOR', 'OTHER'];
  if (!input.reasonCode || !validReasons.includes(input.reasonCode)) {
    return { isValid: false, error: 'Lý do khiếu nại không hợp lệ' };
  }

  const desc = input.description?.trim() || '';
  if (desc.length < 10) {
    return { isValid: false, error: 'Mô tả sự cố phải có ít nhất 10 ký tự' };
  }

  if (input.evidenceImages && input.evidenceImages.length > 3) {
    return { isValid: false, error: 'Tối đa 3 ảnh bằng chứng sự cố' };
  }

  return { isValid: true };
}

export function calculateDisputeRefund(input: DisputeResolutionInput): {
  isValid: boolean;
  refundAmount: number;
  penaltyParty?: string;
  error?: string;
} {
  if (input.action === 'REJECT') {
    return { isValid: true, refundAmount: 0 };
  }

  if (input.action === 'FULL_REFUND') {
    if (!input.orderTotal || input.orderTotal <= 0) {
      return { isValid: false, refundAmount: 0, error: 'Giá trị đơn hàng không hợp lệ' };
    }
    return {
      isValid: true,
      refundAmount: input.orderTotal,
      penaltyParty: input.penaltyParty || 'RESTAURANT',
    };
  }

  if (input.action === 'PARTIAL_REFUND') {
    const amt = Number(input.customAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      return { isValid: false, refundAmount: 0, error: 'Số tiền bồi hoàn một phần phải lớn hơn 0' };
    }
    if (amt > input.orderTotal) {
      return { isValid: false, refundAmount: 0, error: 'Số tiền bồi hoàn không được vượt quá giá trị đơn hàng' };
    }
    return {
      isValid: true,
      refundAmount: amt,
      penaltyParty: input.penaltyParty || 'RESTAURANT',
    };
  }

  return { isValid: false, refundAmount: 0, error: 'Hành động không hợp lệ' };
}

describe('CS Portal Dispute Reporting & Resolution Validation Suite', () => {
  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('[Happy Path] Validate khiếu nại hợp lệ: lý do đồ ăn hỏng, mô tả chi tiết, 2 ảnh bằng chứng', () => {
      const res = validateDisputeInput({
        orderId: 'order-12345',
        reasonCode: 'DAMAGED_FOOD',
        description: 'Hộp cơm bị dập nát, canh bị tràn ra ngoài túi',
        evidenceImages: ['https://s3.local/img1.jpg', 'https://s3.local/img2.jpg'],
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it('[Happy Path] Tính toán hoàn tiền 100% (FULL_REFUND) bằng đúng giá trị đơn hàng 120.000đ', () => {
      const res = calculateDisputeRefund({
        action: 'FULL_REFUND',
        orderTotal: 120000,
        penaltyParty: 'RESTAURANT',
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.refundAmount, 120000);
      assert.strictEqual(res.penaltyParty, 'RESTAURANT');
    });

    it('[Happy Path] Tính toán hoàn tiền một phần (PARTIAL_REFUND) 30.000đ từ quán ăn', () => {
      const res = calculateDisputeRefund({
        action: 'PARTIAL_REFUND',
        orderTotal: 150000,
        customAmount: 30000,
        penaltyParty: 'RESTAURANT',
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.refundAmount, 30000);
      assert.strictEqual(res.penaltyParty, 'RESTAURANT');
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('[Edge Case] Mô tả sự cố đúng chính xác 10 ký tự -> Hợp lệ', () => {
      const res = validateDisputeInput({
        orderId: 'order-12345',
        reasonCode: 'OTHER',
        description: '1234567890',
      });

      assert.strictEqual(res.isValid, true);
    });

    it('[Edge Case] Đính kèm đúng tối đa 3 ảnh bằng chứng -> Hợp lệ', () => {
      const res = validateDisputeInput({
        orderId: 'order-12345',
        reasonCode: 'DAMAGED_FOOD',
        description: 'Hộp thức ăn bị dập nát hoàn toàn',
        evidenceImages: ['https://s3/1.jpg', 'https://s3/2.jpg', 'https://s3/3.jpg'],
      });

      assert.strictEqual(res.isValid, true);
    });

    it('[Edge Case] Hoàn tiền một phần bằng đúng giá trị đơn hàng -> Hợp lệ', () => {
      const res = calculateDisputeRefund({
        action: 'PARTIAL_REFUND',
        orderTotal: 50000,
        customAmount: 50000,
        penaltyParty: 'DRIVER',
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.refundAmount, 50000);
      assert.strictEqual(res.penaltyParty, 'DRIVER');
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Lỗi Nhập Liệu)', () => {
    it('[Error Flow] Mô tả sự cố dưới 10 ký tự -> Báo lỗi', () => {
      const res = validateDisputeInput({
        orderId: 'order-12345',
        reasonCode: 'DAMAGED_FOOD',
        description: 'Bị hỏng',
      });

      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.error, 'Mô tả sự cố phải có ít nhất 10 ký tự');
    });

    it('[Error Flow] Đính kèm quá 3 ảnh bằng chứng (4 ảnh) -> Báo lỗi', () => {
      const res = validateDisputeInput({
        orderId: 'order-12345',
        reasonCode: 'DAMAGED_FOOD',
        description: 'Thức ăn bị giao sai và dập nát',
        evidenceImages: ['1.jpg', '2.jpg', '3.jpg', '4.jpg'],
      });

      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.error, 'Tối đa 3 ảnh bằng chứng sự cố');
    });

    it('[Error Flow] Hoàn tiền một phần vượt quá giá trị đơn hàng -> Báo lỗi', () => {
      const res = calculateDisputeRefund({
        action: 'PARTIAL_REFUND',
        orderTotal: 100000,
        customAmount: 150000,
      });

      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.error, 'Số tiền bồi hoàn không được vượt quá giá trị đơn hàng');
    });

    it('[Error Flow] Bác bỏ khiếu nại (REJECT) -> refundAmount = 0', () => {
      const res = calculateDisputeRefund({
        action: 'REJECT',
        orderTotal: 100000,
      });

      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.refundAmount, 0);
    });
  });
});
