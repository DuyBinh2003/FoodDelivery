import { Injectable, Logger } from '@nestjs/common';
import { LoyaltyRepository } from '@/modules/loyalty/repositories/loyalty.repository.js';
import { LoyaltyTransactionType, LoyaltyReferenceType } from '@/modules/loyalty/enums/loyalty-transaction-type.enum.js';
import { TIER_CONFIGS, calculateTier, MembershipTier } from '@/modules/loyalty/enums/membership-tier.enum.js';
import type { EarnPointsDto } from '@/modules/loyalty/dtos/earn-points.dto.js';

export interface EarnPointsResult {
  success: boolean;
  points_earned: number;
  new_balance: number;
  new_tier: MembershipTier;
  transaction_id?: string;
}

@Injectable()
export class EarnPointsUseCase {
  private readonly logger = new Logger(EarnPointsUseCase.name);

  constructor(private readonly loyaltyRepo: LoyaltyRepository) {}

  async execute(dto: EarnPointsDto): Promise<EarnPointsResult> {
    const { user_id, order_id, qualifying_amount, idempotency_key } = dto;

    // 1. Kiểm tra tính lũy đẳng (Idempotency)
    const existingTx = await this.loyaltyRepo.findTransactionByIdempotencyKey(idempotency_key);
    if (existingTx) {
      this.logger.log(`Idempotent earn request detected for key: ${idempotency_key}`);
      const wallet = await this.loyaltyRepo.getOrCreateWallet(user_id);
      return {
        success: true,
        points_earned: existingTx.points,
        new_balance: wallet.available_points,
        new_tier: wallet.tier,
        transaction_id: existingTx.id,
      };
    }

    // 2. Lấy ví điểm
    const wallet = await this.loyaltyRepo.getOrCreateWallet(user_id);

    // 3. Tính điểm cơ bản: Mỗi 1.000 VND tiền món = 1 điểm
    const basePoints = Math.floor(qualifying_amount / 1000);
    const tierConfig = TIER_CONFIGS[wallet.tier] || TIER_CONFIGS[MembershipTier.BRONZE];
    const earnedPoints = Math.floor(basePoints * tierConfig.earnMultiplier);

    if (earnedPoints <= 0) {
      return {
        success: true,
        points_earned: 0,
        new_balance: wallet.available_points,
        new_tier: wallet.tier,
      };
    }

    // 4. Cộng điểm & cập nhật Hạng thành viên tự động
    wallet.available_points += earnedPoints;
    wallet.lifetime_points += earnedPoints;
    wallet.tier = calculateTier(wallet.lifetime_points);

    await this.loyaltyRepo.saveWallet(wallet);

    // 5. Ghi nhật ký giao dịch bất biến
    const tx = await this.loyaltyRepo.recordTransaction({
      wallet_id: wallet.id,
      user_id,
      transaction_type: LoyaltyTransactionType.EARN,
      points: earnedPoints,
      balance_after: wallet.available_points,
      reference_type: LoyaltyReferenceType.ORDER,
      reference_id: order_id,
      idempotency_key,
      description: `Tích ${earnedPoints} điểm từ đơn hàng #${order_id} (Hạng ${wallet.tier} - Hệ số ${tierConfig.earnMultiplier}x)`,
    });

    return {
      success: true,
      points_earned: earnedPoints,
      new_balance: wallet.available_points,
      new_tier: wallet.tier,
      transaction_id: tx.id,
    };
  }
}
