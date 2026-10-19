import React from 'react';
import { Award, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';
import type { LoyaltyProfileResponse } from '@/features/loyalty/types/loyalty.types';
import { TIER_DETAILS } from '@/features/loyalty/types/loyalty.types';
import { LoyaltyTierBadge } from './LoyaltyTierBadge';

interface LoyaltyTierCardProps {
  profile: LoyaltyProfileResponse;
  customerName?: string;
}

export const LoyaltyTierCard: React.FC<LoyaltyTierCardProps> = ({
  profile,
  customerName = 'Khách hàng thân thiết',
}) => {
  const { wallet, tier_progress } = profile;
  const currentTier = wallet.tier || 'BRONZE';
  const tierInfo = TIER_DETAILS[currentTier] || TIER_DETAILS.BRONZE;

  // Tính phần trăm tiến độ lên hạng kế tiếp
  const nextTier = tier_progress.next_tier;
  const nextTierDetails = nextTier ? TIER_DETAILS[nextTier] : null;

  let progressPercent = 100;
  if (nextTierDetails) {
    const range = nextTierDetails.minPoints - tierInfo.minPoints;
    const currentProgress = wallet.lifetime_points - tierInfo.minPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)));
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-2xl bg-gradient-to-br ${tierInfo.gradient} ${tierInfo.border} text-white transition-all`}
    >
      {/* Decorative background glows */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-black/40 blur-2xl pointer-events-none" />

      {/* Top Bar: Name & Tier Badge */}
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
            Hội viên FoodDelivery Rewards
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white tracking-tight">
            {customerName}
          </h2>
        </div>

        <LoyaltyTierBadge tier={currentTier} size="md" />
      </div>

      {/* Middle: Points Metrics */}
      <div className="relative z-10 mt-8 grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-md">
          <p className="text-xs text-zinc-400 font-medium">Điểm khả dụng để tiêu</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl sm:text-3xl font-extrabold ${tierInfo.textColor}`}>
              {wallet.available_points.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-zinc-400">điểm</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            ≈ {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.available_points * 10)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-black/30 border border-white/5 backdrop-blur-md">
          <p className="text-xs text-zinc-400 font-medium">Tổng điểm trọn đời (Xét Hạng)</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {wallet.lifetime_points.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs text-zinc-400">điểm</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            Hệ số tích: {tierInfo.multiplier}x
          </p>
        </div>
      </div>

      {/* Bottom: Tier Upgrade Progress Bar */}
      <div className="relative z-10 mt-6 pt-5 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-300 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
            {nextTierDetails ? (
              <>
                Lên hạng <strong className={nextTierDetails.textColor}>{nextTierDetails.badge}</strong>:
                cần thêm <strong className="text-white">{tier_progress.points_needed.toLocaleString('vi-VN')}</strong> điểm
              </>
            ) : (
              <span className="text-cyan-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Bạn đang giữ Hạng Thành Viên Cao Nhất!
              </span>
            )}
          </span>
          <span className="font-bold text-zinc-400">{progressPercent}%</span>
        </div>

        {/* Progress track */}
        <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${
              currentTier === 'PLATINUM'
                ? 'from-cyan-400 to-blue-500'
                : 'from-amber-400 via-orange-400 to-yellow-300'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
