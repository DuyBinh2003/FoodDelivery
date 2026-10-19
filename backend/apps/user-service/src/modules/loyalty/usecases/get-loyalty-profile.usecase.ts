import { Injectable } from '@nestjs/common';
import { LoyaltyRepository } from '@/modules/loyalty/repositories/loyalty.repository.js';
import { MembershipTier, TIER_CONFIGS } from '@/modules/loyalty/enums/membership-tier.enum.js';
import type { LoyaltyWallet } from '@/modules/loyalty/entities/loyalty-wallet.entity.js';
import type { LoyaltyTransaction } from '@/modules/loyalty/entities/loyalty-transaction.entity.js';

export interface NextTierProgress {
  next_tier: MembershipTier | null;
  points_needed: number;
  current_multiplier: number;
  next_multiplier: number | null;
}

export interface LoyaltyProfileResponse {
  wallet: {
    available_points: number;
    lifetime_points: number;
    tier: MembershipTier;
    created_at: Date;
  };
  tier_progress: NextTierProgress;
  recent_transactions: Array<{
    id: string;
    transaction_type: string;
    points: number;
    balance_after: number;
    description: string;
    created_at: Date;
  }>;
}

@Injectable()
export class GetLoyaltyProfileUseCase {
  constructor(private readonly loyaltyRepo: LoyaltyRepository) {}

  async execute(userId: string): Promise<LoyaltyProfileResponse> {
    const wallet = await this.loyaltyRepo.getOrCreateWallet(userId);
    const transactions = await this.loyaltyRepo.getRecentTransactions(userId, 20);

    const tierProgress = this.calculateTierProgress(wallet);

    return {
      wallet: {
        available_points: wallet.available_points,
        lifetime_points: wallet.lifetime_points,
        tier: wallet.tier,
        created_at: wallet.created_at,
      },
      tier_progress: tierProgress,
      recent_transactions: transactions.map((tx) => ({
        id: tx.id,
        transaction_type: tx.transaction_type,
        points: tx.points,
        balance_after: tx.balance_after,
        description: tx.description,
        created_at: tx.created_at,
      })),
    };
  }

  private calculateTierProgress(wallet: LoyaltyWallet): NextTierProgress {
    const currentTier = wallet.tier;
    const currentConfig = TIER_CONFIGS[currentTier];

    let nextTier: MembershipTier | null = null;
    let nextMultiplier: number | null = null;
    let pointsNeeded = 0;

    switch (currentTier) {
      case MembershipTier.BRONZE:
        nextTier = MembershipTier.SILVER;
        nextMultiplier = TIER_CONFIGS[MembershipTier.SILVER].earnMultiplier;
        pointsNeeded = Math.max(0, TIER_CONFIGS[MembershipTier.SILVER].minLifetimePoints - wallet.lifetime_points);
        break;
      case MembershipTier.SILVER:
        nextTier = MembershipTier.GOLD;
        nextMultiplier = TIER_CONFIGS[MembershipTier.GOLD].earnMultiplier;
        pointsNeeded = Math.max(0, TIER_CONFIGS[MembershipTier.GOLD].minLifetimePoints - wallet.lifetime_points);
        break;
      case MembershipTier.GOLD:
        nextTier = MembershipTier.PLATINUM;
        nextMultiplier = TIER_CONFIGS[MembershipTier.PLATINUM].earnMultiplier;
        pointsNeeded = Math.max(0, TIER_CONFIGS[MembershipTier.PLATINUM].minLifetimePoints - wallet.lifetime_points);
        break;
      case MembershipTier.PLATINUM:
      default:
        nextTier = null;
        nextMultiplier = null;
        pointsNeeded = 0;
        break;
    }

    return {
      next_tier: nextTier,
      points_needed: pointsNeeded,
      current_multiplier: currentConfig.earnMultiplier,
      next_multiplier: nextMultiplier,
    };
  }
}
