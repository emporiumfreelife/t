/**
 * Membership Tier Pricing Configuration
 * Maps tiers to monthly and annual pricing
 */

export type MembershipTier = 'free' | 'premium' | 'professional' | 'elite';
export type BillingCycle = 'monthly' | 'annual';

export interface TierPrice {
  tier: MembershipTier;
  monthly: number;
  annual: number;
  currency: string;
  description: string;
}

export const TIER_PRICES: Record<MembershipTier, TierPrice> = {
  free: {
    tier: 'free',
    monthly: 0,
    annual: 0,
    currency: 'USD',
    description: 'Forever free',
  },
  premium: {
    tier: 'premium',
    monthly: 9.99,
    annual: 99,
    currency: 'USD',
    description: '/month or $99/year',
  },
  professional: {
    tier: 'professional',
    monthly: 24.99,
    annual: 249,
    currency: 'USD',
    description: '/month or $249/year',
  },
  elite: {
    tier: 'elite',
    monthly: 99.99,
    annual: 999,
    currency: 'USD',
    description: '/month or $999/year',
  },
};

/**
 * Get the price for a specific tier and billing cycle
 */
export function getTierPrice(
  tier: MembershipTier,
  cycle: BillingCycle = 'monthly'
): number {
  const tierConfig = TIER_PRICES[tier];
  if (!tierConfig) return 0;
  return cycle === 'monthly' ? tierConfig.monthly : tierConfig.annual;
}

/**
 * Get billing period in months
 */
export function getBillingPeriodMonths(cycle: BillingCycle): number {
  return cycle === 'monthly' ? 1 : 12;
}

/**
 * Calculate the effective monthly rate (for comparison)
 */
export function getEffectiveMonthlyRate(
  tier: MembershipTier,
  cycle: BillingCycle
): number {
  const price = getTierPrice(tier, cycle);
  const months = getBillingPeriodMonths(cycle);
  return months > 0 ? price / months : 0;
}

/**
 * Check if upgrade is valid (can only upgrade to higher tiers)
 */
export function isValidUpgrade(
  currentTier: MembershipTier,
  targetTier: MembershipTier
): boolean {
  const tierOrder = { free: 0, premium: 1, professional: 2, elite: 3 };
  return tierOrder[targetTier] > tierOrder[currentTier];
}

/**
 * Get next available tier from current tier
 */
export function getNextTier(currentTier: MembershipTier): MembershipTier | null {
  const nextMap: Record<MembershipTier, MembershipTier | null> = {
    free: 'premium',
    premium: 'professional',
    professional: 'elite',
    elite: null,
  };
  return nextMap[currentTier];
}
