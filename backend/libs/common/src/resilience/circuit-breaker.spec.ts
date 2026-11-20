/**
 * [Requirement/Issue: #85]
 * [Target: Common Kernel - Resilience Circuit Breaker Engine]
 * [Compliance: testing-policy (Happy Path, Edge Cases, Error & Rejection Flow)]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '@/common/resilience/circuit-breaker.js';

describe('Resilience Circuit Breaker Engine (#85)', () => {
  let breaker: CircuitBreaker<{ message: string; isFallback?: boolean }>;

  beforeEach(() => {
    breaker = new CircuitBreaker<{ message: string; isFallback?: boolean }>({
      name: 'TestBreaker',
      failureThreshold: 3,
      resetTimeoutMs: 100, // 100ms cho unit test nhanh
      halfOpenSuccessThreshold: 2,
      fallback: () => ({ message: 'DEFAULT_FALLBACK', isFallback: true }),
    });
  });

  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('🟢 [Happy Path] Action thành công bình thường -> Mạch duy trì trạng thái CLOSED', async () => {
      const mockAction = vi.fn().mockResolvedValue({ message: 'SUCCESS' });
      const result = await breaker.execute(mockAction);

      expect(result.message).toBe('SUCCESS');
      expect(result.isFallback).toBeUndefined();
      expect(breaker.getState()).toBe('CLOSED');
      expect(mockAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('🟡 [Edge Case] Mạch từ OPEN chuyển sang HALF_OPEN sau timeout và tự phục hồi về CLOSED', async () => {
      const failingAction = vi.fn().mockRejectedValue(new Error('Downstream Error'));

      // Đạt ngưỡng 3 lỗi để mở mạch
      await breaker.execute(failingAction);
      await breaker.execute(failingAction);
      await breaker.execute(failingAction);

      expect(breaker.getState()).toBe('OPEN');

      // Chờ hết 100ms reset timeout
      await new Promise((resolve) => setTimeout(resolve, 110));

      expect(breaker.getState()).toBe('HALF_OPEN');

      // Canary 1 thành công
      const successAction = vi.fn().mockResolvedValue({ message: 'CANARY_SUCCESS' });
      await breaker.execute(successAction);
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Canary 2 thành công -> Đạt ngưỡng 2 lần thành công -> Quay lại CLOSED
      await breaker.execute(successAction);
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('🟡 [Edge Case] Sử dụng Custom Fallback ghi đè Default Fallback khi action lỗi', async () => {
      const failingAction = vi.fn().mockRejectedValue(new Error('Boom'));
      const customFallback = vi.fn().mockReturnValue({ message: 'CUSTOM_FALLBACK', isFallback: true });

      const res = await breaker.execute(failingAction, customFallback);
      expect(res.message).toBe('CUSTOM_FALLBACK');
      expect(customFallback).toHaveBeenCalled();
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Bảo Vệ Hệ Thống)', () => {
    it('🔴 [Error Flow] Đạt ngưỡng failureThreshold -> Mạch TRIP sang OPEN và chặn gọi action gốc', async () => {
      const failingAction = vi.fn().mockRejectedValue(new Error('Search DB Out of Memory'));

      // 3 lần lỗi liên tiếp
      await breaker.execute(failingAction);
      await breaker.execute(failingAction);
      const res3 = await breaker.execute(failingAction);

      expect(res3.isFallback).toBe(true);
      expect(breaker.getState()).toBe('OPEN');

      // Cuộc gọi thứ 4 khi đang OPEN: KHÔNG được gọi failingAction
      failingAction.mockClear();
      const res4 = await breaker.execute(failingAction);

      expect(res4.isFallback).toBe(true);
      expect(failingAction).not.toHaveBeenCalled(); // Được ngắt ngay lập tức!
    });

    it('🔴 [Error Flow] Tại trạng thái HALF_OPEN nếu có 1 lỗi lập tức quay lại OPEN', async () => {
      breaker.trip(); // Ép sang OPEN
      await new Promise((resolve) => setTimeout(resolve, 110)); // Chờ sang HALF_OPEN
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Thất bại ngay tại canary call đầu tiên
      const failingAction = vi.fn().mockRejectedValue(new Error('Flaky'));
      await breaker.execute(failingAction);

      expect(breaker.getState()).toBe('OPEN');
    });

    it('🔴 [Error Flow] Khi không có fallback function -> Ném ngoại lệ lỗi trực tiếp', async () => {
      const noFallbackBreaker = new CircuitBreaker({
        name: 'NoFallback',
        failureThreshold: 2,
      });

      const failingAction = vi.fn().mockRejectedValue(new Error('Raw Error'));
      await expect(noFallbackBreaker.execute(failingAction)).rejects.toThrow('Raw Error');
    });
  });
});
