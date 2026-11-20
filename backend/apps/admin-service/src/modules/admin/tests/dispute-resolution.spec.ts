/**
 * [Requirement/Issue: #33 / #A2]
 * [Target: AdminService - CS Portal & Dispute Resolution Engine]
 * [Compliance: testing-policy (Happy Path, Edge Cases, Error & Rejection Flow)]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminService } from '@/modules/admin/admin.service.js';
import {
  DisputeStatus,
  DisputePriority,
  ResolutionAction,
  PenaltyParty,
} from '@/modules/admin/entities/order-dispute.entity.js';

describe('AdminService - CS Portal & Dispute Resolution Engine', () => {
  let service: AdminService;
  let mockConfigRepo: any;
  let mockDisputeRepo: any;

  const mockOrder = {
    id: 'order-uuid-1',
    customer_id: 'customer-uuid-1',
    restaurant_id: 'restaurant-uuid-1',
    driver_id: 'driver-uuid-1',
    total_amount: '150000',
    status: 'COMPLETED',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 giờ trước
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  };

  const mockDispute = {
    id: 'dispute-uuid-1',
    order_id: 'order-uuid-1',
    customer_id: 'customer-uuid-1',
    reason_code: 'DAMAGED_FOOD',
    description: 'Đồ ăn bị đổ vỡ hoàn toàn khi nhận hàng',
    evidence_images: ['https://s3.local/img1.jpg'],
    status: DisputeStatus.OPEN,
    priority: DisputePriority.HIGH,
    refund_amount: '0',
    is_deleted: false,
    version: '1',
  };

  beforeEach(() => {
    mockConfigRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn((data) => Promise.resolve(data)),
      create: vi.fn((data) => data),
    };

    mockDisputeRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: 'new-dispute-id', ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
      createQueryBuilder: vi.fn(),
    };

    service = new AdminService(mockConfigRepo, mockDisputeRepo);

    // Mock global fetch
    global.fetch = vi.fn().mockImplementation((url: string, _options?: unknown) => {
      if (url.includes('/internal/orders/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockOrder),
        });
      }
      if (url.includes('/internal/ledger/dispute-refund')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, transaction: { id: 'txn-1' } }),
        });
      }
      if (url.includes('/force-cancel')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (url.includes('/dispatch/proofs/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });
  });

  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('[Happy Path] Khách hàng tạo ticket khiếu nại thành công cho đơn vừa nhận 2 tiếng trước', async () => {
      const result = await service.createDispute({
        order_id: 'order-uuid-1',
        customer_id: 'customer-uuid-1',
        reason_code: 'DAMAGED_FOOD',
        description: 'Đồ ăn bị đổ vỡ hoàn toàn khi nhận hàng',
        evidence_images: ['https://s3.local/img1.jpg'],
      });

      expect(result.status).toBe(DisputeStatus.OPEN);
      expect(result.priority).toBe(DisputePriority.HIGH);
      expect(mockDisputeRepo.save).toHaveBeenCalled();
    });

    it('[Happy Path] CS duyệt Hoàn tiền 100% (FULL_REFUND), phạt nhà hàng và ghi nhận Sổ cái', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({ ...mockDispute });

      const resolved = await service.resolveDispute('dispute-uuid-1', {
        resolution_action: ResolutionAction.FULL_REFUND,
        penalty_party: PenaltyParty.RESTAURANT,
        resolution_notes: 'Bồi thường toàn bộ 150.000đ cho khách hàng do quán đóng gói ẩu',
      });

      expect(resolved.status).toBe(DisputeStatus.RESOLVED);
      expect(resolved.resolution_action).toBe(ResolutionAction.FULL_REFUND);
      expect(resolved.refund_amount).toBe('150000');
      expect(resolved.penalty_party).toBe(PenaltyParty.RESTAURANT);

      // Xác minh gọi fetch sang payment-service dispute-refund
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/internal/ledger/dispute-refund'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"refundAmount":150000'),
        }),
      );
    });

    it('[Happy Path] CS duyệt Hoàn tiền một phần 35.000đ (PARTIAL_REFUND) do giao thiếu 1 món', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({ ...mockDispute });

      const resolved = await service.resolveDispute('dispute-uuid-1', {
        resolution_action: ResolutionAction.PARTIAL_REFUND,
        refund_amount: 35000,
        penalty_party: PenaltyParty.RESTAURANT,
        resolution_notes: 'Hoàn lại 35.000đ tiền trà sữa bị giao thiếu',
      });

      expect(resolved.status).toBe(DisputeStatus.RESOLVED);
      expect(resolved.refund_amount).toBe('35000');
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('[Edge Case] Đơn hàng đã hoàn tất quá 24 giờ -> Bị từ chối tiếp nhận với BadRequestException', async () => {
      const oldOrder = {
        ...mockOrder,
        created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30 giờ trước
        updated_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      };

      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(oldOrder),
        }),
      );

      await expect(
        service.createDispute({
          order_id: 'order-uuid-1',
          customer_id: 'customer-uuid-1',
          reason_code: 'WRONG_ITEMS',
          description: 'Hôm qua tôi phát hiện thiếu món',
        }),
      ).rejects.toThrow(/Thời hạn tiếp nhận khiếu nại cho đơn hàng này đã kết thúc/);
    });

    it('[Edge Case] Thử giải quyết ticket đã RESOLVED -> Bị chặn với ConflictException', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
      });

      await expect(
        service.resolveDispute('dispute-uuid-1', {
          resolution_action: ResolutionAction.FULL_REFUND,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Bác Bỏ)', () => {
    it('[Error Flow] CS Bác bỏ khiếu nại (REJECT) -> Không trừ tiền, ticket chuyển sang REJECTED', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({ ...mockDispute });

      const rejected = await service.resolveDispute('dispute-uuid-1', {
        resolution_action: ResolutionAction.REJECT,
        resolution_notes: 'Ảnh POD chứng minh tài xế đã bàn giao nguyên vẹn cho khách',
      });

      expect(rejected.status).toBe(DisputeStatus.REJECTED);
      expect(rejected.resolution_action).toBe(ResolutionAction.REJECT);
      expect(rejected.resolution_notes).toContain('Ảnh POD chứng minh');
    });

    it('[Error Flow] Tạo khiếu nại cho đơn hàng không tồn tại -> Báo NotFoundException', async () => {
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        }),
      );

      await expect(
        service.createDispute({
          order_id: 'non-existing-order',
          customer_id: 'customer-uuid-1',
          reason_code: 'DAMAGED_FOOD',
          description: 'Lỗi đơn hàng',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('[Error Flow] Nhập số tiền hoàn một phần <= 0 -> Báo BadRequestException', async () => {
      mockDisputeRepo.findOne.mockResolvedValueOnce({ ...mockDispute });

      await expect(
        service.resolveDispute('dispute-uuid-1', {
          resolution_action: ResolutionAction.PARTIAL_REFUND,
          refund_amount: 0,
        }),
      ).rejects.toThrow(/Số tiền bồi hoàn phải lớn hơn 0/);
    });
  });
});
