/**
 * @file loyalty-engine.spec.ts
 * @description Unit tests for Loyalty Points & Rewards Engine (Tích điểm, quy đổi và hoàn trả điểm thưởng)
 * @traceability
 *   - Plan: docs/plans/platform/loyalty-points-rewards-engine.md
 *   - Doc: docs/business/business-roadmap.md (Issue C6 - Epic 2)
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 *   - Use Cases: BurnPointsUseCase, EarnPointsUseCase, RefundPointsUseCase, GetLoyaltyProfileUseCase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { BurnPointsUseCase } from '@/modules/loyalty/usecases/burn-points.usecase.js';
import { EarnPointsUseCase } from '@/modules/loyalty/usecases/earn-points.usecase.js';
import { RefundPointsUseCase } from '@/modules/loyalty/usecases/refund-points.usecase.js';
import { GetLoyaltyProfileUseCase } from '@/modules/loyalty/usecases/get-loyalty-profile.usecase.js';
import { LoyaltyRepository } from '@/modules/loyalty/repositories/loyalty.repository.js';
import { MembershipTier } from '@/modules/loyalty/enums/membership-tier.enum.js';
import { LoyaltyTransactionType, LoyaltyReferenceType } from '@/modules/loyalty/enums/loyalty-transaction-type.enum.js';
import type { LoyaltyWallet } from '@/modules/loyalty/entities/loyalty-wallet.entity.js';
import type { LoyaltyTransaction } from '@/modules/loyalty/entities/loyalty-transaction.entity.js';

describe('Loyalty Points & Rewards Engine', () => {
  let mockLoyaltyRepo: {
    getOrCreateWallet: ReturnType<typeof vi.fn>;
    findWalletByUserId: ReturnType<typeof vi.fn>;
    findTransactionByIdempotencyKey: ReturnType<typeof vi.fn>;
    saveWallet: ReturnType<typeof vi.fn>;
    recordTransaction: ReturnType<typeof vi.fn>;
    getRecentTransactions: ReturnType<typeof vi.fn>;
  };

  let burnPointsUseCase: BurnPointsUseCase;
  let earnPointsUseCase: EarnPointsUseCase;
  let refundPointsUseCase: RefundPointsUseCase;
  let getLoyaltyProfileUseCase: GetLoyaltyProfileUseCase;

  const sampleUserId = 'user-uuid-1234';
  const sampleOrderId = 'order-uuid-5678';

  beforeEach(() => {
    mockLoyaltyRepo = {
      getOrCreateWallet: vi.fn(),
      findWalletByUserId: vi.fn(),
      findTransactionByIdempotencyKey: vi.fn(),
      saveWallet: vi.fn().mockImplementation((w) => Promise.resolve(w)),
      recordTransaction: vi.fn().mockImplementation((t) => Promise.resolve({ id: 'tx-uuid-1', ...t })),
      getRecentTransactions: vi.fn().mockResolvedValue([]),
    };

    burnPointsUseCase = new BurnPointsUseCase(mockLoyaltyRepo as unknown as LoyaltyRepository);
    earnPointsUseCase = new EarnPointsUseCase(mockLoyaltyRepo as unknown as LoyaltyRepository);
    refundPointsUseCase = new RefundPointsUseCase(mockLoyaltyRepo as unknown as LoyaltyRepository);
    getLoyaltyProfileUseCase = new GetLoyaltyProfileUseCase(mockLoyaltyRepo as unknown as LoyaltyRepository);
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN THÀNH CÔNG)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Khách hàng dùng 500 điểm thành công: giảm 5.000 VND và ghi bút toán REDEEM_ORDER', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 1000,
        lifetime_points: 1000,
        tier: MembershipTier.BRONZE,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);

      const result = await burnPointsUseCase.execute({
        user_id: sampleUserId,
        order_id: sampleOrderId,
        points: 500,
        max_discount_amount: 50000, // 50% của subtotal 100.000 VND
        idempotency_key: `burn_${sampleOrderId}`,
      });

      expect(result.success).toBe(true);
      expect(result.points_burned).toBe(500);
      expect(result.discount_amount).toBe(5000);
      expect(result.remaining_points).toBe(500);

      expect(mockLoyaltyRepo.saveWallet).toHaveBeenCalledWith(
        expect.objectContaining({ available_points: 500 }),
      );
      expect(mockLoyaltyRepo.recordTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: LoyaltyTransactionType.REDEEM_ORDER,
          points: -500,
          balance_after: 500,
          reference_id: sampleOrderId,
        }),
      );
    });

    it('2. Khách hàng hoàn tất đơn hàng tích điểm: đơn 100.000 VND tích 100 điểm (hạng Bronze 1.0x)', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 200,
        lifetime_points: 500,
        tier: MembershipTier.BRONZE,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);

      const result = await earnPointsUseCase.execute({
        user_id: sampleUserId,
        order_id: sampleOrderId,
        qualifying_amount: 100000,
        idempotency_key: `earn_${sampleOrderId}`,
      });

      expect(result.success).toBe(true);
      expect(result.points_earned).toBe(100);
      expect(result.new_balance).toBe(300);
      expect(result.new_tier).toBe(MembershipTier.BRONZE);

      expect(mockLoyaltyRepo.saveWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          available_points: 300,
          lifetime_points: 600,
        }),
      );
    });

    it('3. Khách hàng hạng Gold (hệ số 1.5x) tích 150 điểm cho đơn 100.000 VND', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 1000,
        lifetime_points: 60000,
        tier: MembershipTier.GOLD,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);

      const result = await earnPointsUseCase.execute({
        user_id: sampleUserId,
        order_id: sampleOrderId,
        qualifying_amount: 100000,
        idempotency_key: `earn_gold_${sampleOrderId}`,
      });

      expect(result.success).toBe(true);
      expect(result.points_earned).toBe(150); // 100 * 1.5
      expect(result.new_balance).toBe(1150);
    });

    it('4. Khách hàng hủy đơn đã tiêu điểm: hoàn lại đúng số điểm đã trừ vào ví', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 500,
        lifetime_points: 1000,
        tier: MembershipTier.BRONZE,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      const originalBurnTx: LoyaltyTransaction = {
        id: 'tx-burn-1',
        wallet_id: 'wallet-1',
        user_id: sampleUserId,
        transaction_type: LoyaltyTransactionType.REDEEM_ORDER,
        points: -500,
        balance_after: 500,
        reference_type: LoyaltyReferenceType.ORDER,
        reference_id: sampleOrderId,
        idempotency_key: `burn_${sampleOrderId}`,
        description: 'Burn points for order',
        created_at: new Date(),
        wallet: mockWallet,
      };

      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getRecentTransactions.mockResolvedValue([originalBurnTx]);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);

      const result = await refundPointsUseCase.execute({
        user_id: sampleUserId,
        order_id: sampleOrderId,
        idempotency_key: `refund_${sampleOrderId}`,
      });

      expect(result.success).toBe(true);
      expect(result.points_refunded).toBe(500);
      expect(result.remaining_points).toBe(1000);

      expect(mockLoyaltyRepo.saveWallet).toHaveBeenCalledWith(
        expect.objectContaining({ available_points: 1000 }),
      );
      expect(mockLoyaltyRepo.recordTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: LoyaltyTransactionType.REFUND,
          points: 500,
          balance_after: 1000,
        }),
      );
    });

    it('5. Xem thông tin ví điểm: trả về số dư, hạng, tiến độ hạng kế tiếp và lịch sử', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 2500,
        lifetime_points: 3000,
        tier: MembershipTier.BRONZE,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);
      mockLoyaltyRepo.getRecentTransactions.mockResolvedValue([
        {
          id: 'tx-1',
          transaction_type: LoyaltyTransactionType.EARN,
          points: 100,
          balance_after: 2500,
          description: 'Tích điểm đơn hàng',
          created_at: new Date(),
        } as LoyaltyTransaction,
      ]);

      const profile = await getLoyaltyProfileUseCase.execute(sampleUserId);

      expect(profile.wallet.available_points).toBe(2500);
      expect(profile.wallet.tier).toBe(MembershipTier.BRONZE);
      expect(profile.tier_progress.next_tier).toBe(MembershipTier.SILVER);
      expect(profile.tier_progress.points_needed).toBe(7000); // 10000 - 3000
      expect(profile.tier_progress.current_multiplier).toBe(1.0);
      expect(profile.tier_progress.next_multiplier).toBe(1.25);
      expect(profile.recent_transactions).toHaveLength(1);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (GIỚI HẠN BIÊN & CHỐNG TRÙNG LẶP)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Đổi điểm vượt trần giảm giá 50% Subtotal: bị từ chối với thông báo vượt trần', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 5000,
        lifetime_points: 5000,
        tier: MembershipTier.BRONZE,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);

      // Đơn 40.000 VND (trần 50% = 20.000 VND tương đương max 2.000 điểm), nhưng khách muốn dùng 3.000 điểm (30.000 VND)
      await expect(
        burnPointsUseCase.execute({
          user_id: sampleUserId,
          order_id: sampleOrderId,
          points: 3000,
          max_discount_amount: 20000,
          idempotency_key: `burn_edge_${sampleOrderId}`,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('2. Đổi điểm dưới mức tối thiểu 100 điểm: bị từ chối ngay lập tức', async () => {
      await expect(
        burnPointsUseCase.execute({
          user_id: sampleUserId,
          order_id: sampleOrderId,
          points: 50,
          max_discount_amount: 10000,
          idempotency_key: `burn_min_${sampleOrderId}`,
        }),
      ).rejects.toThrow('Số điểm quy đổi tối thiểu là 100 điểm');
    });

    it('3. Chống trừ điểm trùng lặp (Idempotency): gọi lại cùng idempotency_key không trừ ví lần 2', async () => {
      const existingTx: LoyaltyTransaction = {
        id: 'tx-existing-1',
        wallet_id: 'wallet-1',
        user_id: sampleUserId,
        transaction_type: LoyaltyTransactionType.REDEEM_ORDER,
        points: -500,
        balance_after: 500,
        reference_type: LoyaltyReferenceType.ORDER,
        reference_id: sampleOrderId,
        idempotency_key: `burn_duplicate_key`,
        description: 'Previously burned',
        created_at: new Date(),
        wallet: {} as LoyaltyWallet,
      };
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(existingTx);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue({
        id: 'wallet-1',
        available_points: 500,
      } as LoyaltyWallet);

      const result = await burnPointsUseCase.execute({
        user_id: sampleUserId,
        order_id: sampleOrderId,
        points: 500,
        idempotency_key: `burn_duplicate_key`,
      });

      expect(result.success).toBe(true);
      expect(result.points_burned).toBe(500);
      expect(result.transaction_id).toBe('tx-existing-1');
      expect(mockLoyaltyRepo.saveWallet).not.toHaveBeenCalled();
    });

    it('4. Tự động nâng hạng thành viên: khi lifetime_points vượt 10.000 điểm tự động thăng hạng SILVER', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 9950,
        lifetime_points: 9950,
        tier: MembershipTier.BRONZE,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);

      // Đơn 100.000 VND tích 100 điểm -> lifetime_points lên 10.050 -> thăng hạng SILVER
      const result = await earnPointsUseCase.execute({
        user_id: sampleUserId,
        order_id: sampleOrderId,
        qualifying_amount: 100000,
        idempotency_key: `earn_upgrade_${sampleOrderId}`,
      });

      expect(result.success).toBe(true);
      expect(result.new_tier).toBe(MembershipTier.SILVER);
      expect(mockLoyaltyRepo.saveWallet).toHaveBeenCalledWith(
        expect.objectContaining({ tier: MembershipTier.SILVER }),
      );
    });

    it('5. Hủy đơn hàng không dùng điểm: kết thúc an toàn (No-op), không ném ngoại lệ lỗi', async () => {
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getRecentTransactions.mockResolvedValue([]); // Không có transaction burn nào
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue({
        id: 'wallet-1',
        available_points: 1000,
      } as LoyaltyWallet);

      const result = await refundPointsUseCase.execute({
        user_id: sampleUserId,
        order_id: 'order-no-points',
        idempotency_key: 'refund-no-points',
      });

      expect(result.success).toBe(true);
      expect(result.points_refunded).toBe(0);
      expect(mockLoyaltyRepo.saveWallet).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR / REJECTION FLOW (NGOẠI LỆ & BẢO VỆ)
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('1. Khách hàng tiêu điểm vượt quá số dư ví: ném BadRequestException và không thay đổi ví', async () => {
      const mockWallet: LoyaltyWallet = {
        id: 'wallet-1',
        user_id: sampleUserId,
        available_points: 200, // Chỉ có 200 điểm
        lifetime_points: 200,
        tier: MembershipTier.BRONZE,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        transactions: [],
      };
      mockLoyaltyRepo.findTransactionByIdempotencyKey.mockResolvedValue(null);
      mockLoyaltyRepo.getOrCreateWallet.mockResolvedValue(mockWallet);

      // Muốn dùng 500 điểm -> Lỗi
      await expect(
        burnPointsUseCase.execute({
          user_id: sampleUserId,
          order_id: sampleOrderId,
          points: 500,
          idempotency_key: `burn_insufficient_${sampleOrderId}`,
        }),
      ).rejects.toThrow('Số điểm tích lũy không đủ');

      expect(mockLoyaltyRepo.saveWallet).not.toHaveBeenCalled();
      expect(mockLoyaltyRepo.recordTransaction).not.toHaveBeenCalled();
    });
  });
});
