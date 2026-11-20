/**
 * TRACEABILITY HEADER
 * Task Code: enterprise-voucher-management-engine
 * Requirement: Enterprise Multi-Layer Stacking, High-Concurrency Claim, Two-Phase Reservation & Emergency Kill Switch
 * Implementation Plan: docs/plans/platform/enterprise-voucher-management-engine.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecommendBestComboUseCase } from '@/modules/orders/usecases/recommend-best-combo.usecase.js';
import { ClaimVoucherUseCase } from '@/modules/orders/usecases/claim-voucher.usecase.js';
import { ReserveVouchersUseCase } from '@/modules/orders/usecases/reserve-vouchers.usecase.js';
import { CommitVoucherReservationUseCase } from '@/modules/orders/usecases/commit-voucher-reservation.usecase.js';
import { ReleaseVoucherReservationUseCase } from '@/modules/orders/usecases/release-voucher-reservation.usecase.js';
import { EmergencyKillCampaignUseCase } from '@/modules/orders/usecases/emergency-kill-campaign.usecase.js';
import { VoucherCategory } from '@/modules/orders/enums/voucher-category.enum.js';
import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';
import { CampaignSponsor } from '@/modules/orders/enums/campaign-sponsor.enum.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';
import { ReservationStatus } from '@/modules/orders/enums/reservation-status.enum.js';
import { Voucher } from '@/modules/orders/entities/voucher.entity.js';
import { Campaign } from '@/modules/orders/entities/campaign.entity.js';
import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('Enterprise Voucher Management Engine Test Suite', () => {
  let mockVoucherRepo: any;
  let mockPromoRedisRepo: any;

  let recommendBestComboUseCase: RecommendBestComboUseCase;
  let claimVoucherUseCase: ClaimVoucherUseCase;
  let reserveVouchersUseCase: ReserveVouchersUseCase;
  let commitVoucherReservationUseCase: CommitVoucherReservationUseCase;
  let releaseVoucherReservationUseCase: ReleaseVoucherReservationUseCase;
  let emergencyKillCampaignUseCase: EmergencyKillCampaignUseCase;

  const validCampaign: Campaign = {
    id: 'camp-001',
    code: 'MEGA_11_11',
    name: 'Đại Tiệc 11.11',
    sponsor_type: CampaignSponsor.CO_FUNDED,
    platform_share_ratio: 70,
    merchant_share_ratio: 30,
    partner_share_ratio: 0,
    total_budget_amount: 100000000,
    current_spent_amount: 15000000,
    emergency_killed: false,
    start_time: new Date(Date.now() - 3600000),
    end_time: new Date(Date.now() + 86400000 * 7),
    created_at: new Date(),
    updated_at: new Date(),
    vouchers: [],
  };

  const sampleVouchers: Voucher[] = [
    {
      id: 'v-ship-01',
      code: 'FREESHIP15',
      name: 'Miễn phí giao hàng 15k',
      description: 'Giảm 15k phí giao hàng',
      voucher_type: VoucherType.FIXED_AMOUNT,
      voucher_category: VoucherCategory.FREE_SHIPPING,
      distribution_type: 'COLLECTIBLE' as any,
      sponsor_type: VoucherSponsor.PLATFORM,
      discount_value: 15000,
      max_discount_amount: 15000,
      min_order_amount: 50000,
      total_quantity: 1000,
      claimed_quantity: 10,
      used_quantity: 5,
      max_claims_per_user: 2,
      max_usage_per_user: 2,
      valid_from: new Date(Date.now() - 3600000),
      valid_to: new Date(Date.now() + 86400000),
      start_hour: null,
      end_hour: null,
      is_active: true,
      is_deleted: false,
      restaurant_id: null,
      target_restaurant_id: null,
      campaign_id: 'camp-001',
      campaign: validCampaign,
      created_at: new Date(),
      updated_at: new Date(),
      usages: [],
    },
    {
      id: 'v-rest-01',
      code: 'QUAN20',
      name: 'Quán ăn giảm 20k',
      description: 'Giảm 20k cho đơn từ 100k tại Quán A',
      voucher_type: VoucherType.FIXED_AMOUNT,
      voucher_category: VoucherCategory.MERCHANT_DISCOUNT,
      distribution_type: 'COLLECTIBLE' as any,
      sponsor_type: VoucherSponsor.MERCHANT,
      restaurant_id: 'rest-001',
      target_restaurant_id: 'rest-001',
      discount_value: 20000,
      max_discount_amount: 20000,
      min_order_amount: 100000,
      total_quantity: 500,
      claimed_quantity: 20,
      used_quantity: 10,
      max_claims_per_user: 1,
      max_usage_per_user: 1,
      valid_from: new Date(Date.now() - 3600000),
      valid_to: new Date(Date.now() + 86400000),
      start_hour: null,
      end_hour: null,
      is_active: true,
      is_deleted: false,
      campaign_id: null,
      campaign: null,
      created_at: new Date(),
      updated_at: new Date(),
      usages: [],
    },
    {
      id: 'v-plat-01',
      code: 'PLATFORM30',
      name: 'Sàn giảm 30%',
      description: 'Giảm 30% tối đa 40k toàn sàn',
      voucher_type: VoucherType.PERCENTAGE,
      voucher_category: VoucherCategory.PLATFORM_DISCOUNT,
      distribution_type: 'COLLECTIBLE' as any,
      sponsor_type: VoucherSponsor.PLATFORM,
      discount_value: 30,
      max_discount_amount: 40000,
      min_order_amount: 120000,
      total_quantity: 2000,
      claimed_quantity: 150,
      used_quantity: 40,
      max_claims_per_user: 1,
      max_usage_per_user: 1,
      valid_from: new Date(Date.now() - 3600000),
      valid_to: new Date(Date.now() + 86400000),
      start_hour: null,
      end_hour: null,
      is_active: true,
      is_deleted: false,
      restaurant_id: null,
      target_restaurant_id: null,
      campaign_id: 'camp-001',
      campaign: validCampaign,
      created_at: new Date(),
      updated_at: new Date(),
      usages: [],
    },
    {
      id: 'v-pay-01',
      code: 'MOMO10',
      name: 'Giảm 10k trả qua MoMo',
      description: 'Giảm 10k khi chọn thanh toán MoMo',
      voucher_type: VoucherType.FIXED_AMOUNT,
      voucher_category: VoucherCategory.PAYMENT_DISCOUNT,
      distribution_type: 'COLLECTIBLE' as any,
      sponsor_type: VoucherSponsor.PLATFORM,
      discount_value: 10000,
      max_discount_amount: 10000,
      min_order_amount: 80000,
      total_quantity: 500,
      claimed_quantity: 10,
      used_quantity: 2,
      max_claims_per_user: 1,
      max_usage_per_user: 1,
      valid_from: new Date(Date.now() - 3600000),
      valid_to: new Date(Date.now() + 86400000),
      start_hour: null,
      end_hour: null,
      is_active: true,
      is_deleted: false,
      restaurant_id: null,
      target_restaurant_id: null,
      campaign_id: null,
      campaign: null,
      rules: [
        {
          id: 'rule-01',
          voucher_id: 'v-pay-01',
          rule_type: 'PAYMENT_METHOD' as any,
          operator: 'EQUALS',
          rule_payload: { allowed_methods: ['MOMO'] },
          error_message: 'Chỉ áp dụng khi thanh toán bằng ví MoMo',
          created_at: new Date(),
          voucher: null as any,
        },
      ],
      created_at: new Date(),
      updated_at: new Date(),
      usages: [],
    },
  ];

  beforeEach(() => {
    mockVoucherRepo = {
      findById: vi.fn((id: string) => Promise.resolve(sampleVouchers.find((v) => v.id === id) || null)),
      findByCode: vi.fn((code: string) => Promise.resolve(sampleVouchers.find((v) => v.code === code) || null)),
      findActiveVouchers: vi.fn(() => Promise.resolve(sampleVouchers)),
      getUserVouchers: vi.fn(() =>
        Promise.resolve(
          sampleVouchers.map((v) => ({
            id: `uv-${v.id}`,
            user_id: 'user-001',
            voucher_id: v.id,
            voucher: v,
            status: UserVoucherStatus.AVAILABLE,
            claimed_at: new Date(),
            expires_at: v.valid_to,
          })),
        ),
      ),
      countDeviceClaims: vi.fn(() => Promise.resolve(1)),
      countUserClaims: vi.fn(() => Promise.resolve(0)),
      claimVoucherForUser: vi.fn((params: any) =>
        Promise.resolve({
          id: 'uv-new-01',
          user_id: params.userId,
          voucher_id: params.voucherId,
          status: UserVoucherStatus.AVAILABLE,
          expires_at: params.expiresAt,
        }),
      ),
      createReservation: vi.fn((params: any) => Promise.resolve({ id: 'res-01', ...params })),
      updateUserVoucherStatus: vi.fn(() => Promise.resolve()),
      findReservationsByOrder: vi.fn((orderId: string) =>
        Promise.resolve([
          {
            id: 'res-01',
            order_id: orderId,
            voucher_id: 'v-plat-01',
            user_id: 'user-001',
            discount_amount: 40000,
            voucher: sampleVouchers[2],
            status: ReservationStatus.LOCKED,
          },
        ]),
      ),
      atomicIncrementUsedQuantity: vi.fn(() => Promise.resolve(true)),
      updateCampaignSpent: vi.fn(() => Promise.resolve()),
      updateMerchantBudgetSpent: vi.fn(() => Promise.resolve()),
      createUsage: vi.fn((data: any) => Promise.resolve({ id: 'usage-01', ...data })),
      commitReservations: vi.fn(() => Promise.resolve()),
      releaseReservations: vi.fn(() => Promise.resolve()),
      findCampaignById: vi.fn((id: string) => Promise.resolve(id === validCampaign.id ? validCampaign : null)),
      emergencyKillCampaign: vi.fn(() => Promise.resolve(true)),
    };

    mockPromoRedisRepo = {
      checkRateLimit: vi.fn(() => Promise.resolve(true)),
      atomicClaimVoucher: vi.fn(() => Promise.resolve({ success: true, remainingQuota: 99 })),
      reserveVouchers: vi.fn((orderId: string, voucherIds: string[]) =>
        Promise.resolve({ success: true, ticketToken: `tkt_${orderId}`, lockedVoucherIds: voucherIds }),
      ),
      releaseReservation: vi.fn(() => Promise.resolve(true)),
    };

    recommendBestComboUseCase = new RecommendBestComboUseCase(mockVoucherRepo);
    claimVoucherUseCase = new ClaimVoucherUseCase(mockVoucherRepo, mockPromoRedisRepo);
    reserveVouchersUseCase = new ReserveVouchersUseCase(mockVoucherRepo, mockPromoRedisRepo);
    commitVoucherReservationUseCase = new CommitVoucherReservationUseCase(mockVoucherRepo, mockPromoRedisRepo);
    releaseVoucherReservationUseCase = new ReleaseVoucherReservationUseCase(mockVoucherRepo, mockPromoRedisRepo);
    emergencyKillCampaignUseCase = new EmergencyKillCampaignUseCase(mockVoucherRepo);
  });

  // ==========================================
  // NHÁNH 1: LUỒNG CHUẨN THÀNH CÔNG (HAPPY PATH)
  // ==========================================
  describe('Nhánh 1: Luồng chuẩn thành công (Happy Path)', () => {
    it('HP-01: Gộp mã 4 tầng (Multi-Layer Stacking) thành công cho đơn hàng hợp lệ', async () => {
      const result = await recommendBestComboUseCase.execute({
        customerId: 'user-001',
        restaurantId: 'rest-001',
        subtotal: 200000,
        deliveryFee: 25000,
        paymentMethod: 'MOMO',
      });

      expect(result.selected_vouchers).toHaveLength(4);
      const categories = result.selected_vouchers.map((v) => v.category);
      expect(categories).toContain(VoucherCategory.FREE_SHIPPING);
      expect(categories).toContain(VoucherCategory.MERCHANT_DISCOUNT);
      expect(categories).toContain(VoucherCategory.PLATFORM_DISCOUNT);
      expect(categories).toContain(VoucherCategory.PAYMENT_DISCOUNT);

      // Ship giảm 15k -> final_delivery_fee = 10k
      expect(result.shipping_discount_amount).toBe(15000);
      expect(result.final_delivery_fee).toBe(10000);

      // Food: Quán giảm 20k + Sàn 40k + MoMo 10k = 70k -> subtotal còn 130k
      expect(result.food_discount_amount).toBe(70000);
      expect(result.final_subtotal).toBe(130000);
      expect(result.final_total_amount).toBe(140000);
      expect(result.total_discount_amount).toBe(85000);
    });

    it('HP-02: Khách hàng claim voucher Flash Sale thành công vào Ví cá nhân', async () => {
      const result = await claimVoucherUseCase.execute({
        voucherId: 'v-ship-01',
        userId: 'user-001',
        deviceFingerprint: 'device_iphone_15_pro',
      });

      expect(result.success).toBe(true);
      expect(result.voucher_id).toBe('v-ship-01');
      expect(result.remaining_quota).toBe(99);
      expect(mockVoucherRepo.claimVoucherForUser).toHaveBeenCalled();
    });

    it('HP-03: Two-Phase Commit thành công và phân bổ Sổ Cái Co-Funded chính xác', async () => {
      const result = await commitVoucherReservationUseCase.execute({
        orderId: 'order-101',
        customerId: 'user-001',
        restaurantId: 'rest-001',
      });

      expect(result.success).toBe(true);
      expect(result.committed_vouchers_count).toBe(1);
      expect(result.total_discount_amount).toBe(40000);

      // Co-Funded 70% Sàn - 30% Quán: Sàn chịu 28.000đ, Quán chịu 12.000đ
      expect(mockVoucherRepo.createUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          voucher_id: 'v-plat-01',
          discount_amount: 40000,
          platform_funded_amount: 28000,
          merchant_funded_amount: 12000,
          partner_funded_amount: 0,
        }),
      );
      expect(mockVoucherRepo.commitReservations).toHaveBeenCalledWith('order-101');
      expect(mockPromoRedisRepo.releaseReservation).toHaveBeenCalled();
    });

    it('HP-04: Best Value Suggester tự động chọn voucher tối ưu nhất', async () => {
      const result = await recommendBestComboUseCase.execute({
        customerId: 'user-001',
        restaurantId: 'rest-001',
        subtotal: 150000,
        deliveryFee: 15000,
        paymentMethod: 'COD', // Không được áp MoMo
      });

      // Chỉ chọn Freeship + Quán + Sàn (bỏ MoMo)
      expect(result.selected_vouchers).toHaveLength(3);
      expect(result.ineligible_vouchers.some((iv) => iv.code === 'MOMO10')).toBe(true);
    });

    it('HP-05: Two-Phase Release giải phóng giữ chỗ và hoàn voucher về trạng thái AVAILABLE', async () => {
      const result = await releaseVoucherReservationUseCase.execute({
        orderId: 'order-101',
        customerId: 'user-001',
      });

      expect(result.success).toBe(true);
      expect(result.released_count).toBe(1);
      expect(mockVoucherRepo.updateUserVoucherStatus).toHaveBeenCalledWith(
        'user-001',
        'v-plat-01',
        UserVoucherStatus.AVAILABLE,
      );
      expect(mockVoucherRepo.releaseReservations).toHaveBeenCalledWith('order-101');
    });
  });

  // ==========================================
  // NHÁNH 2: CÁC TRƯỜNG HỢP BIÊN (EDGE CASES)
  // ==========================================
  describe('Nhánh 2: Các trường hợp biên (Edge Cases)', () => {
    it('EC-01: Đua lệnh còn đúng 1 voucher cuối cùng (Out of stock khi quota về 0)', async () => {
      mockPromoRedisRepo.atomicClaimVoucher.mockResolvedValueOnce({
        success: false,
        errorCode: 'OUT_OF_STOCK',
        message: 'Voucher đã hết số lượng phát hành',
      });

      await expect(
        claimVoucherUseCase.execute({
          voucherId: 'v-ship-01',
          userId: 'user-999',
          deviceFingerprint: 'device_abc',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('EC-02: Giảm giá phần trăm vượt quá trần quy định (Boundary Ceiling)', async () => {
      // Sàn giảm 30% của 300.000đ là 90.000đ, nhưng trần là 40.000đ
      const result = await recommendBestComboUseCase.execute({
        customerId: 'user-001',
        restaurantId: 'rest-other', // Không khớp quán A
        subtotal: 300000,
        deliveryFee: 10000,
        paymentMethod: 'COD',
      });

      const platVoucher = result.selected_vouchers.find((v) => v.category === VoucherCategory.PLATFORM_DISCOUNT);
      expect(platVoucher?.discount_amount).toBe(40000); // Bị chặn đúng trần 40k
    });

    it('EC-03: Tổng tiền giảm voucher lớn hơn tổng tiền đơn hàng (Không để đơn hàng âm tiền)', async () => {
      // Đơn 55k, Freeship 15k trên cước ship 10k -> Freeship chỉ trừ tối đa 10k
      const result = await recommendBestComboUseCase.execute({
        customerId: 'user-001',
        restaurantId: 'rest-other',
        subtotal: 55000,
        deliveryFee: 10000,
        paymentMethod: 'COD',
      });

      expect(result.shipping_discount_amount).toBe(10000);
      expect(result.final_delivery_fee).toBe(0);
      expect(result.final_total_amount).toBe(55000);
    });

    it('EC-04: Làm tròn tiền Co-Funding khớp đúng 100% không lệch đồng nào', async () => {
      mockVoucherRepo.findReservationsByOrder.mockResolvedValueOnce([
        {
          id: 'res-odd',
          order_id: 'order-odd',
          voucher_id: 'v-plat-01',
          discount_amount: 33333,
          voucher: {
            ...sampleVouchers[2],
            campaign: {
              ...validCampaign,
              platform_share_ratio: 70,
              merchant_share_ratio: 30,
              partner_share_ratio: 0,
            },
          },
        },
      ]);

      const result = await commitVoucherReservationUseCase.execute({
        orderId: 'order-odd',
        customerId: 'user-001',
        restaurantId: 'rest-001',
      });

      expect(result.success).toBe(true);
      expect(mockVoucherRepo.createUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          discount_amount: 33333,
          platform_funded_amount: 23333, // 70% của 33333
          merchant_funded_amount: 10000, // 30% của 33333
          partner_funded_amount: 0,
        }),
      );
    });

    it('EC-05: Giá trị đơn hàng vừa chạm đúng ngưỡng min_order_amount', async () => {
      const result = await recommendBestComboUseCase.execute({
        customerId: 'user-001',
        restaurantId: 'rest-001',
        subtotal: 100000, // Đúng min_order_amount của QUAN20
        deliveryFee: 15000,
        paymentMethod: 'COD',
      });

      const merchantVoucher = result.selected_vouchers.find((v) => v.category === VoucherCategory.MERCHANT_DISCOUNT);
      expect(merchantVoucher).toBeDefined();
      expect(merchantVoucher?.code).toBe('QUAN20');
    });
  });

  // ==========================================
  // NHÁNH 3: LUỒNG LỖI & CHỐNG VI PHẠM (ERROR FLOW)
  // ==========================================
  describe('Nhánh 3: Luồng lỗi & Chống vi phạm (Error / Rejection Flow)', () => {
    it('ERR-01: Chặn áp dụng đồng thời 2 voucher cùng nhóm mục đích (Mutual Exclusion)', async () => {
      mockVoucherRepo.findById.mockImplementation((id: string) => {
        if (id === 'v-ship-01') return Promise.resolve(sampleVouchers[0]);
        if (id === 'v-ship-02') {
          return Promise.resolve({
            ...sampleVouchers[0],
            id: 'v-ship-02',
            code: 'FREESHIP_EXTRA',
            voucher_category: VoucherCategory.FREE_SHIPPING,
          });
        }
        return Promise.resolve(null);
      });

      await expect(
        reserveVouchersUseCase.execute({
          orderId: 'order-clash',
          userId: 'user-001',
          voucherIds: ['v-ship-01', 'v-ship-02'], // Cùng là FREE_SHIPPING
          subtotal: 100000,
          deliveryFee: 20000,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('ERR-02: Từ chối claim khi chiến dịch đã bị ngắt khẩn cấp (Emergency Kill Switch Active)', async () => {
      mockVoucherRepo.findById.mockResolvedValueOnce({
        ...sampleVouchers[0],
        campaign: {
          ...validCampaign,
          emergency_killed: true,
        },
      });

      await expect(
        claimVoucherUseCase.execute({
          voucherId: 'v-ship-01',
          userId: 'user-001',
          deviceFingerprint: 'device_01',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ERR-03: Chặn thiết bị clone nhiều tài khoản trục lợi (Device Fingerprint Abuse)', async () => {
      mockVoucherRepo.countDeviceClaims.mockResolvedValueOnce(6); // Vượt trần 5 lượt/ngày

      await expect(
        claimVoucherUseCase.execute({
          voucherId: 'v-ship-01',
          userId: 'user-clone-9',
          deviceFingerprint: 'device_sybil_attacker',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ERR-04: Người dùng đã lưu tối đa số lần cho phép (Max Claims Per User Exceeded)', async () => {
      mockVoucherRepo.countUserClaims.mockResolvedValueOnce(2); // Voucher v-ship-01 có max_claims = 2

      await expect(
        claimVoucherUseCase.execute({
          voucherId: 'v-ship-01',
          userId: 'user-001',
          deviceFingerprint: 'device_01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('ERR-05: Vi phạm điều kiện Rule Engine (Chỉ áp dụng khi thanh toán MoMo)', async () => {
      const result = await recommendBestComboUseCase.execute({
        customerId: 'user-001',
        restaurantId: 'rest-001',
        subtotal: 150000,
        deliveryFee: 20000,
        paymentMethod: 'COD', // Vi phạm MoMo
      });

      const momoIneligible = result.ineligible_vouchers.find((v) => v.code === 'MOMO10');
      expect(momoIneligible).toBeDefined();
      expect(momoIneligible?.rejection_reason).toContain('MoMo');
    });

    it('ERR-06: Chặn spam request quá giới hạn (Rate Limiting Spike Block)', async () => {
      mockPromoRedisRepo.checkRateLimit.mockResolvedValueOnce(false); // Quá 30 req/phút

      await expect(
        claimVoucherUseCase.execute({
          voucherId: 'v-ship-01',
          userId: 'spammer_bot',
          deviceFingerprint: 'device_bot',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-07: Kích hoạt thành công Emergency Kill Switch cho chiến dịch', async () => {
      const result = await emergencyKillCampaignUseCase.execute('camp-001');
      expect(result.success).toBe(true);
      expect(mockVoucherRepo.emergencyKillCampaign).toHaveBeenCalledWith('camp-001');
    });
  });
});
