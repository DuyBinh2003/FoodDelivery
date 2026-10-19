import React from 'react';
import type { MembershipTier } from '@/features/loyalty/types/loyalty.types';
import { TIER_DETAILS } from '@/features/loyalty/types/loyalty.types';
import { Award, Sparkles } from 'lucide-react';

interface LoyaltyTierBadgeProps {
  tier: MembershipTier;
  showMultiplier?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const LoyaltyTierBadge: React.FC<LoyaltyTierBadgeProps> = ({
  tier,
  showMultiplier = true,
  size = 'md',
}) => {
  const info = TIER_DETAILS[tier] || TIER_DETAILS.BRONZE;

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5 font-semibold',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border bg-gradient-to-r font-medium shadow-sm backdrop-blur-md ${info.gradient} ${info.border} ${info.textColor} ${sizeClasses[size]}`}
    >
      <Award className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      <span>{info.badge}</span>
      {showMultiplier && (
        <span className="flex items-center gap-0.5 text-[11px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white">
          <Sparkles className="w-3 h-3 text-yellow-300" />
          {info.multiplier}x
        </span>
      )}
    </div>
  );
};
