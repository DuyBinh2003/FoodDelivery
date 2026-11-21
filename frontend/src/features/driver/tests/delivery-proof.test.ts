/**
 * @file delivery-proof.test.ts
 * @description Unit tests for driver proof of delivery (POD) upload, payload formatting, and file validation.
 * @traceability
 * - Issue: #30 - Quy trình giao nhận (Delivery Flow)
 * - Plan: docs/plans/driver/proof-of-delivery-flow-and-photo-verification.md
 * - Target: frontend/src/features/driver/components/driver-dashboard/proof-of-delivery-modal.tsx
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export function validateProofFile(file: { type: string; size: number } | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: 'Vui lòng chọn file hình ảnh' };
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Vui lòng chọn file hình ảnh (JPG, PNG, WebP)' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'Dung lượng ảnh không được vượt quá 5MB' };
  }
  return { valid: true };
}

export function formatProofPayload(input: {
  driverId: string;
  proofType: 'PICKED_UP' | 'DELIVERED';
  imageUrl: string;
  lat: number;
  lng: number;
  notes?: string;
}) {
  return {
    driver_id: input.driverId,
    proof_type: input.proofType,
    image_url: input.imageUrl,
    captured_lat: Number(input.lat.toFixed(6)),
    captured_lng: Number(input.lng.toFixed(6)),
    notes: input.notes?.trim() || undefined,
  };
}

describe('Proof of Delivery (POD) Suite (Frontend)', () => {
  describe('🟢 Happy Path', () => {
    it('1. validateProofFile: Xác thực thành công file ảnh JPG hợp lệ dưới 5MB', () => {
      const result = validateProofFile({ type: 'image/jpeg', size: 1024 * 500 });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, undefined);
    });

    it('2. validateProofFile: Xác thực thành công file ảnh WebP', () => {
      const result = validateProofFile({ type: 'image/webp', size: 1024 * 300 });
      assert.strictEqual(result.valid, true);
    });

    it('3. formatProofPayload: Format chuẩn hóa payload gửi sang API delivery proof', () => {
      const payload = formatProofPayload({
        driverId: 'd1d2d3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        proofType: 'DELIVERED',
        imageUrl: 'https://s3.localstack.cloud/food-delivery-assets/proof.jpg',
        lat: 10.776891234,
        lng: 106.700891234,
        notes: '   Gửi lễ tân tầng 1   ',
      });

      assert.strictEqual(payload.driver_id, 'd1d2d3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d');
      assert.strictEqual(payload.proof_type, 'DELIVERED');
      assert.strictEqual(payload.captured_lat, 10.776891);
      assert.strictEqual(payload.captured_lng, 106.700891);
      assert.strictEqual(payload.notes, 'Gửi lễ tân tầng 1');
    });
  });

  describe('🟡 Edge Cases', () => {
    it('1. formatProofPayload: Xử lý ghi chú rỗng hoặc chỉ có khoảng trắng thành undefined', () => {
      const payload = formatProofPayload({
        driverId: 'd1d2d3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
        proofType: 'PICKED_UP',
        imageUrl: 'https://s3.localstack.cloud/food-delivery-assets/picked.jpg',
        lat: 10.79,
        lng: 106.67,
        notes: '     ',
      });

      assert.strictEqual(payload.notes, undefined);
      assert.strictEqual(payload.proof_type, 'PICKED_UP');
    });

    it('2. validateProofFile: Chấp nhận file kích thước sát mốc tối đa 5MB', () => {
      const result = validateProofFile({ type: 'image/png', size: 5 * 1024 * 1024 });
      assert.strictEqual(result.valid, true);
    });
  });

  describe('🔴 Error / Rejection Flow', () => {
    it('1. validateProofFile: Từ chối khi file là null hoặc undefined', () => {
      const result = validateProofFile(null);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Vui lòng chọn file hình ảnh');
    });

    it('2. validateProofFile: Từ chối khi định dạng không phải hình ảnh (ví dụ: application/pdf)', () => {
      const result = validateProofFile({ type: 'application/pdf', size: 2048 });
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Vui lòng chọn file hình ảnh (JPG, PNG, WebP)');
    });

    it('3. validateProofFile: Từ chối khi kích thước ảnh vượt quá 5MB', () => {
      const result = validateProofFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 });
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'Dung lượng ảnh không được vượt quá 5MB');
    });
  });
});
