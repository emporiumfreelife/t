/**
 * Community Membership Tier Configuration
 * Pricing and benefits for community members joining our platform
 * Platform-level membership for all users, not per-creator subscriptions
 */

export type MemberTier = 'welcome' | 'premium' | 'elite' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

interface TierPricing {
  monthly: number;
  annual: number;
}

interface TierConfig {
  name: string;
  displayName: string;
  description: string;
  pricing: TierPricing;
  benefits: string[];
  color: string; // For UI styling
}

const TIER_CONFIGS: Record<MemberTier, TierConfig> = {
  welcome: {
    name: 'welcome',
    displayName: 'Welcome',
    description: 'Start supporting creators',
    pricing: {
      monthly: 2.99,
      annual: 29.88,
    },
    benefits: [
      'Support creators directly with your membership',
      'Access community forums and creator discussions',
      'Weekly updates on creator spotlights',
      'Join community events and networking',
      'Member-only discount on creator services (5%)',
      'Access resource library for creators',
    ],
    color: 'blue',
  },
  premium: {
    name: 'premium',
    displayName: 'Premium',
    description: 'Enhanced support for creators',
    pricing: {
      monthly: 9.99,
      annual: 99.00,
    },
    benefits: [
      'Everything in Welcome tier',
      'Priority access to creator development tools',
      'Exclusive webinars on creator growth strategies',
      'Monthly direct Q&A with platform leaders',
      'Premium member badge in creator spaces',
      'Ad-free experience supporting fair creator revenue',
      'Early access to creator-focused features',
      'Private networking with other supporters',
      'Premium discount code for creator services (15%)',
    ],
    color: 'purple',
  },
  elite: {
    name: 'elite',
    displayName: 'Elite',
    description: 'Champion creator ecosystem growth',
    pricing: {
      monthly: 19.99,
      annual: 199.00,
    },
    benefits: [
      'Everything in Premium tier',
      'Dedicated creator champion support',
      'Bi-weekly strategic calls with platform team (30 min)',
      'Exclusive creator success resources and playbooks',
      'Elite champion badge in community',
      'Direct access to platform leadership',
      'Quarterly exclusive community builder events',
      'Premium discounts on platform services (20%)',
      'Beta access to new creator tools and features',
      'Personalized creator growth strategy guidance',
      'VIP recognition in members directory',
    ],
    color: 'rose',
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Build the future of creator economy',
    pricing: {
      monthly: 49.99,
      annual: 499.00,
    },
    benefits: [
      'Everything in Elite tier',
      '24/7 priority creator ecosystem support',
      'Weekly strategic calls with platform leadership (1 hour)',
      'Custom creator growth programs for your community',
      'Enterprise partner badge with platinum status',
      'Direct line to platform executive team',
      'Exclusive quarterly enterprise partner summits',
      'Dedicated account concierge for all requests',
      'Immediate access to all beta features',
      'Dedicated creator ecosystem success manager',
      'Custom platform integrations and solutions',
      'Enterprise partner event invitations',
      'Annual strategic planning with leadership',
      'Exclusive enterprise partner recognition program',
      'Lifetime partnership status with priority support',
    ],
    color: 'orange',
  },
};

export function getTierConfig(tier: MemberTier): TierConfig {
  return TIER_CONFIGS[tier];
}

export function getTierPrice(tier: MemberTier, cycle: BillingCycle): number {
  return TIER_CONFIGS[tier].pricing[cycle];
}

export function getBillingPeriodMonths(cycle: BillingCycle): number {
  return cycle === 'annual' ? 12 : 1;
}

export function getEffectiveMonthlyRate(
  tier: MemberTier,
  cycle: BillingCycle
): number {
  const price = getTierPrice(tier, cycle);
  const months = getBillingPeriodMonths(cycle);
  return price / months;
}

export function getAllTiers(): MemberTier[] {
  return ['welcome', 'premium', 'elite', 'enterprise'];
}

export function getTierDisplayName(tier: MemberTier): string {
  return TIER_CONFIGS[tier].displayName;
}

export function getTierDescription(tier: MemberTier): string {
  return TIER_CONFIGS[tier].description;
}

export function getTierBenefits(tier: MemberTier): string[] {
  return TIER_CONFIGS[tier].benefits;
}

export function isValidTierUpgrade(
  currentTier: MemberTier,
  targetTier: MemberTier
): boolean {
  const tierOrder: Record<MemberTier, number> = {
    welcome: 1,
    premium: 2,
    elite: 3,
    enterprise: 4,
  };
  return tierOrder[targetTier] > tierOrder[currentTier];
}

export function getNextTier(tier: MemberTier): MemberTier | null {
  const tiers: MemberTier[] = ['welcome', 'premium', 'elite', 'enterprise'];
  const currentIndex = tiers.indexOf(tier);
  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null;
  }
  return tiers[currentIndex + 1];
}

export function calculateSavings(
  tier: MemberTier
): { amount: number; percentage: number } {
  const monthlyPrice = getTierPrice(tier, 'monthly');
  const annualPrice = getTierPrice(tier, 'annual');
  const annualMonthlyEquivalent = monthlyPrice * 12;
  const savings = annualMonthlyEquivalent - annualPrice;
  const percentage = Math.round((savings / annualMonthlyEquivalent) * 100);

  return {
    amount: savings,
    percentage,
  };
}

export default TIER_CONFIGS;
