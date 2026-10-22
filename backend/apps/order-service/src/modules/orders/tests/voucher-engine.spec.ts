/**
 * @file voucher-engine.spec.ts
 * @description Unit tests for Voucher & Promotion Engine (Validate, Apply, Revert, and Rule Constraints)
 *
 * Traceability Matrix:
 * - Module: Order Service - Voucher Module
 * - Task Code: promotion-voucher-engine
 * - Issue: #75 (Hệ thống Voucher & Khuyến mại đa tầng tích hợp Sổ cái kép)
 * - Plan: docs/plans/platform/promotion-voucher-engine.md
 *
 * Test Scenarios:
 * 1. Happy Path (HP-01 -> HP-04):
 *    - HP-01: Áp dụng Voucher PERCENTAGE hợp lệ (20%, trần 30.000 VND).
 *    - HP-02: Áp dụng Voucher FIXED_AMOUNT hợp lệ (25.000 VND).
 *    - HP-03: Áp dụng Voucher FREE_SHIPPING hợp lệ (giảm phí ship).
 *    - HP-04: Hoàn voucher thành công khi đơn hủy (RevertVoucherUseCase).
 * 2. Edge Cases (EC-01 -> EC-05):
 *    - EC-01: Đơn hàng vừa chạm đúng ngưỡng min_order_amount.
 *    - EC-02: Giảm % vượt quá mức trần max_discount_amount thì bị chặn đúng trần.
 *    - EC-03: Voucher chỉ còn đúng 1 lượt duy nhất (total_quantity - used_quantity = 1).
 *    - EC-04: Khung giờ vàng (đang trong giờ hiệu lực).
 *    - EC-05: Số tiền giảm FIXED_AMOUNT vượt quá subtotal (chỉ giảm tối đa bằng subtotal).
 * 3. Error Flow (ERR-01 -> ERR-08):
 *    - ERR-01: Mã voucher không tồn tại hoặc đã bị xóa mềm.
 *    - ERR-02: Mã voucher đã hết hạn hoặc chưa đến ngày bắt đầu.
 *    - ERR-03: Áp dụng ngoài khung giờ vàng.
 *    - ERR-04: Đơn hàng chưa đạt giá trị tối thiểu min_order_amount.
 *    - ERR-05: Voucher quán A áp dụng cho quán B.
 *    - ERR-06: Voucher đã hết sạch lượt toàn sàn.
 *    - ERR-07: Khách hàng đã đạt tối đa số lần cho phép (max_usage_per_user).
 *    - ERR-08: Tạo voucher merchant nhưng thiếu restaurant_id.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ValidateVoucherUseCase } from '@/modules/orders/usecases/validate-voucher.usecase.js';
import { ApplyVoucherUseCase } from '@/modules/orders/usecases/apply-voucher.usecase.js';
import { RevertVoucherUseCase } from '@/modules/orders/usecases/revert-voucher.usecase.js';
import { CreateVoucherUseCase } from '@/modules/orders/usecases/create-voucher.usecase.js';
import { GetAvailableVouchersUseCase } from '@/modules/orders/usecases/get-available-vouchers.usecase.js';
import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';
import { VoucherUsageStatus } from '@/modules/orders/enums/voucher-usage-status.enum.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';
import type { VoucherUsage } from '@/modules/orders/entities/voucher-usage.entity.js';
import type { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';

describe('Voucher & Promotion Engine (Issue #75)', () => {
  let mockVoucherRepo: {
    findByCode: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    createVoucher: ReturnType<typeof vi.fn>;
    findActiveVouchers: ReturnType<typeof vi.fn>;
    countUserUsage: ReturnType<typeof vi.fn>;
    atomicIncrementUsedQuantity: ReturnType<typeof vi.fn>;
    atomicDecrementUsedQuantity: ReturnType<typeof vi.fn>;
    createUsage: ReturnType<typeof vi.fn>;
    findUsageByOrder: ReturnType<typeof vi.fn>;
    revertUsage: ReturnType<typeof vi.fn>;
  };

  let validateUseCase: ValidateVoucherUseCase;
  let applyUseCase: ApplyVoucherUseCase;
  let revertUseCase: RevertVoucherUseCase;
  let createUseCase: CreateVoucherUseCase;
  let getAvailableUseCase: GetAvailableVouchersUseCase;

  const mockBaseVoucher: Voucher = {
    id: 'voucher-uuid-001',
    code: 'GIAM20',
    name: 'Giảm 20% đơn từ 100k',
    description: 'Giảm 20% tối đa 30.000 VND',
    voucher_type: VoucherType.PERCENTAGE,
    sponsor_type: VoucherSponsor.PLATFORM,
    restaurant_id: null,
    discount_value: 20,
    max_discount_amount: 30000,
    min_order_amount: 100000,
    total_quantity: 100,
    used_quantity: 10,
    max_usage_per_user: 2,
    valid_from: new Date('2026-01-01T00:00:00Z'),
    valid_to: new Date('2026-12-31T23:59:59Z'),
    start_hour: null,
    end_hour: null,
    is_active: true,
    is_deleted: false,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    usages: [],
  };

  beforeEach(() => {
    mockVoucherRepo = {
      findByCode: vi.fn(),
      findById: vi.fn(),
      createVoucher: vi.fn(),
      findActiveVouchers: vi.fn(),
      countUserUsage: vi.fn().mockResolvedValue(0),
      atomicIncrementUsedQuantity: vi.fn().mockResolvedValue(true),
      atomicDecrementUsedQuantity: vi.fn().mockResolvedValue(true),
      createUsage: vi.fn(),
      findUsageByOrder: vi.fn(),
      revertUsage: vi.fn().mockResolvedValue(undefined),
    };

    validateUseCase = new ValidateVoucherUseCase(mockVoucherRepo as unknown as VoucherRepository);
    applyUseCase = new ApplyVoucherUseCase(validateUseCase, mockVoucherRepo as unknown as VoucherRepository);
    revertUseCase = new RevertVoucherUseCase(mockVoucherRepo as unknown as VoucherRepository);
    createUseCase = new CreateVoucherUseCase(mockVoucherRepo as unknown as VoucherRepository);
    getAvailableUseCase = new GetAvailableVouchersUseCase(mockVoucherRepo as unknown as VoucherRepository);
  });

  // ==========================================
  // NHÁNH 1: HAPPY PATH (HP-01 -> HP-04)
  // ==========================================
  describe('Nhánh 1: Happy Path', () => {
    it('HP-01: Áp dụng Voucher PERCENTAGE hợp lệ (20%, trần 30k, đơn 100k -> giảm 20k)', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher);

      const result = await validateUseCase.execute({
        code: 'GIAM20',
        restaurant_id: 'res-1',
        subtotal: 100000,
        delivery_fee: 15000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(result.is_valid).toBe(true);
      expect(result.discount_amount).toBe(20000);
      expect(result.final_subtotal).toBe(80000);
      expect(result.final_delivery_fee).toBe(15000);
      expect(result.final_total_amount).toBe(95000);
    });

    it('HP-02: Áp dụng Voucher FIXED_AMOUNT hợp lệ (giảm 25.000 VND)', async () => {
      const fixedVoucher: Voucher = {
        ...mockBaseVoucher,
        code: 'TIENMAT25',
        voucher_type: VoucherType.FIXED_AMOUNT,
        discount_value: 25000,
        min_order_amount: 50000,
      };
      mockVoucherRepo.findByCode.mockResolvedValue(fixedVoucher);

      const result = await validateUseCase.execute({
        code: 'TIENMAT25',
        restaurant_id: 'res-1',
        subtotal: 80000,
        delivery_fee: 15000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(result.is_valid).toBe(true);
      expect(result.discount_amount).toBe(25000);
      expect(result.final_subtotal).toBe(55000);
      expect(result.final_total_amount).toBe(70000);
    });

    it('HP-03: Áp dụng Voucher FREE_SHIPPING hợp lệ (giảm phí ship)', async () => {
      const freeShipVoucher: Voucher = {
        ...mockBaseVoucher,
        code: 'FREESHIP',
        voucher_type: VoucherType.FREE_SHIPPING,
        discount_value: 15000,
        min_order_amount: 50000,
      };
      mockVoucherRepo.findByCode.mockResolvedValue(freeShipVoucher);

      const result = await validateUseCase.execute({
        code: 'FREESHIP',
        restaurant_id: 'res-1',
        subtotal: 70000,
        delivery_fee: 15000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(result.is_valid).toBe(true);
      expect(result.discount_amount).toBe(15000);
      expect(result.final_delivery_fee).toBe(0);
      expect(result.final_subtotal).toBe(70000);
      expect(result.final_total_amount).toBe(70000);
    });

    it('HP-04: Áp dụng voucher khi tạo đơn và hoàn voucher thành công khi đơn hủy', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher);
      const mockUsage: VoucherUsage = {
        id: 'usage-123',
        voucher_id: mockBaseVoucher.id,
        order_id: 'order-999',
        customer_id: 'user-001',
        discount_amount: 20000,
        status: VoucherUsageStatus.APPLIED,
        applied_at: new Date(),
        reverted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        voucher: mockBaseVoucher,
      };
      mockVoucherRepo.createUsage.mockResolvedValue(mockUsage);

      // Apply
      const applied = await applyUseCase.execute({
        code: 'GIAM20',
        order_id: 'order-999',
        customer_id: 'user-001',
        restaurant_id: 'res-1',
        subtotal: 100000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });
      expect(applied.validation.is_valid).toBe(true);
      expect(mockVoucherRepo.atomicIncrementUsedQuantity).toHaveBeenCalledWith(mockBaseVoucher.id);
      expect(mockVoucherRepo.createUsage).toHaveBeenCalled();

      // Revert (khi đơn hủy)
      mockVoucherRepo.findUsageByOrder.mockResolvedValue(mockUsage);
      const revertResult = await revertUseCase.execute('order-999');
      expect(revertResult.reverted).toBe(true);
      expect(mockVoucherRepo.revertUsage).toHaveBeenCalledWith('usage-123');
      expect(mockVoucherRepo.atomicDecrementUsedQuantity).toHaveBeenCalledWith(mockBaseVoucher.id);
    });

    it('HP-05: Lấy danh sách voucher khả dụng và tính toán tiền giảm ước tính', async () => {
      mockVoucherRepo.findActiveVouchers.mockResolvedValue([mockBaseVoucher]);

      const available = await getAvailableUseCase.execute({
        restaurant_id: 'res-1',
        subtotal: 100000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(available).toHaveLength(1);
      expect(available[0].is_applicable).toBe(true);
      expect(available[0].estimated_discount).toBe(20000);
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES (EC-01 -> EC-05)
  // ==========================================
  describe('Nhánh 2: Edge Cases', () => {
    it('EC-01: Đơn hàng vừa chạm đúng ngưỡng tối thiểu min_order_amount', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher);

      // min_order_amount = 100000, subtotal = 100000
      const result = await validateUseCase.execute({
        code: 'GIAM20',
        restaurant_id: 'res-1',
        subtotal: 100000,
        delivery_fee: 15000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(result.is_valid).toBe(true);
      expect(result.discount_amount).toBe(20000);
    });

    it('EC-02: Giảm % vượt quá mức trần max_discount_amount (20% của 200k là 40k, trần 30k -> giảm 30k)', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher);

      const result = await validateUseCase.execute({
        code: 'GIAM20',
        restaurant_id: 'res-1',
        subtotal: 200000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(result.discount_amount).toBe(30000);
      expect(result.final_subtotal).toBe(170000);
    });

    it('EC-03: Voucher chỉ còn đúng 1 lượt duy nhất (total: 10, used: 9)', async () => {
      const nearLimitVoucher: Voucher = {
        ...mockBaseVoucher,
        total_quantity: 10,
        used_quantity: 9,
      };
      mockVoucherRepo.findByCode.mockResolvedValue(nearLimitVoucher);

      const result = await validateUseCase.execute({
        code: 'GIAM20',
        restaurant_id: 'res-1',
        subtotal: 100000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(result.is_valid).toBe(true);
    });

    it('EC-04: Khung giờ vàng (voucher chỉ áp dụng 11:00 đến 14:00, order lúc 12:30)', async () => {
      const goldenHourVoucher: Voucher = {
        ...mockBaseVoucher,
        start_hour: 11,
        end_hour: 14,
      };
      mockVoucherRepo.findByCode.mockResolvedValue(goldenHourVoucher);

      const testTime = new Date('2026-06-01T12:30:00');
      const result = await validateUseCase.execute({
        code: 'GIAM20',
        restaurant_id: 'res-1',
        subtotal: 100000,
        currentTime: testTime,
      });

      expect(result.is_valid).toBe(true);
    });

    it('EC-05: Số tiền giảm FIXED_AMOUNT vượt quá subtotal (giảm 100k cho đơn 80k -> chỉ giảm 80k)', async () => {
      const largeFixedVoucher: Voucher = {
        ...mockBaseVoucher,
        code: 'TIENMAT100',
        voucher_type: VoucherType.FIXED_AMOUNT,
        discount_value: 100000,
        min_order_amount: 50000,
      };
      mockVoucherRepo.findByCode.mockResolvedValue(largeFixedVoucher);

      const result = await validateUseCase.execute({
        code: 'TIENMAT100',
        restaurant_id: 'res-1',
        subtotal: 80000,
        delivery_fee: 15000,
        currentTime: new Date('2026-06-01T12:00:00Z'),
      });

      expect(result.discount_amount).toBe(80000);
      expect(result.final_subtotal).toBe(0);
      expect(result.final_total_amount).toBe(15000);
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR / REJECTION FLOW (ERR-01 -> ERR-08)
  // ==========================================
  describe('Nhánh 3: Error / Rejection Flow', () => {
    it('ERR-01: Ném NotFoundException nếu mã voucher không tồn tại hoặc đã bị xóa mềm', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(null);

      await expect(
        validateUseCase.execute({
          code: 'KHONGTONTAI',
          restaurant_id: 'res-1',
          subtotal: 150000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ERR-02: Ném BadRequestException nếu mã voucher đã hết hạn hoặc chưa đến ngày bắt đầu', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher);

      // currentTime là năm 2027 (đã hết hạn 31-12-2026)
      await expect(
        validateUseCase.execute({
          code: 'GIAM20',
          restaurant_id: 'res-1',
          subtotal: 150000,
          currentTime: new Date('2027-01-01T00:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-03: Ném BadRequestException nếu áp dụng ngoài khung giờ vàng', async () => {
      const goldenHourVoucher: Voucher = {
        ...mockBaseVoucher,
        start_hour: 11,
        end_hour: 14,
      };
      mockVoucherRepo.findByCode.mockResolvedValue(goldenHourVoucher);

      // Áp dụng lúc 15:00
      const testTime = new Date('2026-06-01T15:00:00');
      await expect(
        validateUseCase.execute({
          code: 'GIAM20',
          restaurant_id: 'res-1',
          subtotal: 150000,
          currentTime: testTime,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-04: Ném BadRequestException nếu đơn hàng chưa đạt giá trị tối thiểu min_order_amount', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher); // min = 100k

      await expect(
        validateUseCase.execute({
          code: 'GIAM20',
          restaurant_id: 'res-1',
          subtotal: 99000,
          currentTime: new Date('2026-06-01T12:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-05: Ném BadRequestException nếu Voucher của Quán A áp dụng cho đơn hàng của Quán B', async () => {
      const merchantVoucher: Voucher = {
        ...mockBaseVoucher,
        sponsor_type: VoucherSponsor.MERCHANT,
        restaurant_id: 'res-A',
      };
      mockVoucherRepo.findByCode.mockResolvedValue(merchantVoucher);

      await expect(
        validateUseCase.execute({
          code: 'GIAM20',
          restaurant_id: 'res-B', // Khác quán A
          subtotal: 150000,
          currentTime: new Date('2026-06-01T12:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-06: Ném BadRequestException nếu Voucher đã hết sạch số lượt toàn hệ thống', async () => {
      const exhaustedVoucher: Voucher = {
        ...mockBaseVoucher,
        total_quantity: 10,
        used_quantity: 10,
      };
      mockVoucherRepo.findByCode.mockResolvedValue(exhaustedVoucher);

      await expect(
        validateUseCase.execute({
          code: 'GIAM20',
          restaurant_id: 'res-1',
          subtotal: 150000,
          currentTime: new Date('2026-06-01T12:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-07: Ném BadRequestException nếu người dùng đã sử dụng tối đa số lần cho phép (max_usage_per_user)', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher); // max_usage = 2
      mockVoucherRepo.countUserUsage.mockResolvedValue(2); // đã dùng 2 lần

      await expect(
        validateUseCase.execute({
          code: 'GIAM20',
          restaurant_id: 'res-1',
          customer_id: 'user-001',
          subtotal: 150000,
          currentTime: new Date('2026-06-01T12:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-08: Ném BadRequestException khi tạo voucher MERCHANT mà thiếu restaurant_id', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(null);

      await expect(
        createUseCase.execute({
          code: 'QUAN_KM',
          name: 'Khuyến mãi quán',
          voucher_type: VoucherType.PERCENTAGE,
          sponsor_type: VoucherSponsor.MERCHANT,
          discount_value: 10,
          total_quantity: 50,
          valid_from: '2026-01-01',
          valid_to: '2026-12-31',
          // Thiếu restaurant_id
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-09: Ném ConflictException khi tạo voucher bị trùng mã code', async () => {
      mockVoucherRepo.findByCode.mockResolvedValue(mockBaseVoucher);

      await expect(
        createUseCase.execute({
          code: 'GIAM20',
          name: 'Trùng mã',
          voucher_type: VoucherType.PERCENTAGE,
          sponsor_type: VoucherSponsor.PLATFORM,
          discount_value: 10,
          total_quantity: 50,
          valid_from: '2026-01-01',
          valid_to: '2026-12-31',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
