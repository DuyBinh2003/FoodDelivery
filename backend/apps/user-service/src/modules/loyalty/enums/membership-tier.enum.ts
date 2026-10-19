export enum MembershipTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export interface TierConfig {
  name: MembershipTier;
  minLifetimePoints: number;
  earnMultiplier: number;
}

export const TIER_CONFIGS: Record<MembershipTier, TierConfig> = {
  [MembershipTier.BRONZE]: {
    name: MembershipTier.BRONZE,
    minLifetimePoints: 0,
    earnMultiplier: 1.0,
  },
  [MembershipTier.SILVER]: {
    name: MembershipTier.SILVER,
    minLifetimePoints: 10000,
    earnMultiplier: 1.25,
  },
  [MembershipTier.GOLD]: {
    name: MembershipTier.GOLD,
    minLifetimePoints: 50000,
    earnMultiplier: 1.5,
  },
  [MembershipTier.PLATINUM]: {
    name: MembershipTier.PLATINUM,
    minLifetimePoints: 100000,
    earnMultiplier: 2.0,
  },
};

export function calculateTier(lifetimePoints: number): MembershipTier {
  if (lifetimePoints >= TIER_CONFIGS[MembershipTier.PLATINUM].minLifetimePoints) {
    return MembershipTier.PLATINUM;
  }
  if (lifetimePoints >= TIER_CONFIGS[MembershipTier.GOLD].minLifetimePoints) {
    return MembershipTier.GOLD;
  }
  if (lifetimePoints >= TIER_CONFIGS[MembershipTier.SILVER].minLifetimePoints) {
    return MembershipTier.SILVER;
  }
  return MembershipTier.BRONZE;
}
