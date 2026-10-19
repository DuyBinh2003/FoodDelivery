export type MembershipTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export type LoyaltyTransactionType =
  | 'EARN'
  | 'REDEEM_ORDER'
  | 'REDEEM_VOUCHER'
  | 'REFUND'
  | 'EXPIRE'
  | 'ADJUSTMENT';

export interface LoyaltyWallet {
  available_points: number;
  lifetime_points: number;
  tier: MembershipTier;
  created_at: string;
}

export interface NextTierProgress {
  next_tier: MembershipTier | null;
  points_needed: number;
  current_multiplier: number;
  next_multiplier: number | null;
}

export interface LoyaltyTransaction {
  id: string;
  transaction_type: LoyaltyTransactionType;
  points: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export interface LoyaltyProfileResponse {
  wallet: LoyaltyWallet;
  tier_progress: NextTierProgress;
  recent_transactions: LoyaltyTransaction[];
}

export interface TierInfo {
  tier: MembershipTier;
  label: string;
  badge: string;
  multiplier: number;
  minPoints: number;
  gradient: string;
  border: string;
  textColor: string;
}

export const TIER_DETAILS: Record<MembershipTier, TierInfo> = {
  BRONZE: {
    tier: 'BRONZE',
    label: 'Thành viên Đồng',
    badge: '🥉 Đồng',
    multiplier: 1.0,
    minPoints: 0,
    gradient: 'from-amber-900/60 via-orange-900/40 to-zinc-900',
    border: 'border-amber-700/50',
    textColor: 'text-amber-400',
  },
  SILVER: {
    tier: 'SILVER',
    label: 'Thành viên Bạc',
    badge: '🥈 Bạc',
    multiplier: 1.25,
    minPoints: 10000,
    gradient: 'from-slate-700/60 via-zinc-800/40 to-zinc-900',
    border: 'border-slate-400/50',
    textColor: 'text-slate-300',
  },
  GOLD: {
    tier: 'GOLD',
    label: 'Thành viên Vàng',
    badge: '🥇 Vàng',
    multiplier: 1.5,
    minPoints: 50000,
    gradient: 'from-yellow-600/60 via-amber-700/40 to-zinc-900',
    border: 'border-yellow-500/50',
    textColor: 'text-yellow-400',
  },
  PLATINUM: {
    tier: 'PLATINUM',
    label: 'Thành viên Bạch Kim',
    badge: '💎 Bạch Kim',
    multiplier: 2.0,
    minPoints: 100000,
    gradient: 'from-cyan-600/60 via-blue-800/40 to-zinc-900',
    border: 'border-cyan-400/50',
    textColor: 'text-cyan-300',
  },
};
