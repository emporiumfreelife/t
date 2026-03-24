import React, { useState, useEffect } from 'react';
import { Crown, Star, Zap, Trophy, Check, ArrowRight, Lock, Unlock, TrendingUp, Users, Award, Calendar, Briefcase, Heart, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth, TIER_POINTS } from '../context/AuthContext';
import { useUserStats } from '../hooks/useUserStats';
import { supabase } from '../lib/supabase';
import { MembershipTier } from '../lib/tierPricingConfig';
import MembershipPaymentModalV2 from '../components/MembershipPaymentModalV2';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
  duration?: number;
}

interface TierBenefits {
  [key: string]: {
    name: string;
    badge: React.ReactNode;
    color: string;
    bgColor: string;
    price: string;
    billing: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
  };
}

const tierBenefits: TierBenefits = {
  free: {
    name: 'Free',
    badge: <Star className="w-5 h-5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    price: '$0',
    billing: 'Forever free',
    description: 'Perfect for getting started',
    icon: <Star className="w-8 h-8 text-gray-400" />,
    features: [
      'Basic portfolio (5 items max)',
      'Limited profile customization',
      'View-only analytics',
      'Standard event access',
      'Email support',
      'Join challenges',
      'Basic networking',
    ],
  },
  premium: {
    name: 'Premium',
    badge: <Zap className="w-5 h-5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    price: '$9.99',
    billing: '/month or $99/year',
    description: 'Grow with your community',
    icon: <Zap className="w-8 h-8 text-blue-400" />,
    features: [
      'Unlimited portfolio items',
      'Advanced profile customization',
      'Detailed analytics & insights',
      'Priority in opportunities',
      'Priority event access',
      'Exclusive discounts',
      'Advanced networking tools',
      'Monthly creator updates',
      'Featured in discovery',
      'Peer learning with other creators',
    ],
  },
  professional: {
    name: 'Professional',
    badge: <Trophy className="w-5 h-5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    price: '$24.99',
    billing: '/month or $249/year',
    description: 'Build with your community',
    icon: <Trophy className="w-8 h-8 text-purple-400" />,
    features: [
      'Everything in Premium',
      'Custom domain for portfolio',
      'Advanced team & community collaboration',
      'AI-powered analytics',
      'Priority support (24/7)',
      'Custom branding options',
      'Exclusive collaboration opportunities',
      'Advanced content tools',
      'Custom integrations',
      'Monthly strategy calls',
      'Premium badge on profile',
      'Collaborate with creators in your niche',
      'Access to creator mastermind groups',
    ],
  },
  elite: {
    name: 'Elite',
    badge: <Crown className="w-5 h-5" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    price: '$99.99',
    billing: '/month or $999/year',
    description: 'Lead your creator community',
    icon: <Crown className="w-8 h-8 text-rose-400" />,
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'White-label portfolio',
      'Priority in all opportunities',
      'VIP events & masterclasses',
      'Advanced team & community management',
      'Custom API access',
      'Priority feature requests',
      'Premium placement',
      'Weekly strategy sessions',
      'Lifetime support',
      'Exclusive Elite creator community',
      'First access to new features',
      'Lead community mastermind groups',
      'Shared growth opportunities with peers',
    ],
  },
};

export default function CreatorsMembership() {
  const { user, session } = useAuth();
  const { stats } = useUserStats();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<MembershipTier | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentUser, setCurrentUser] = useState(user);

  // Update local user state when auth user changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  const addToast = (message: string, type: 'success' | 'error' = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message, duration };
    setToasts((prev) => [...prev, toast]);

    if (duration) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto text-center py-20">
          <p className="text-gray-400">Please sign in to view your membership</p>
        </div>
      </div>
    );
  }

  const getNextTier = (): string | null => {
    if (currentUser.tier === 'free') return 'premium';
    if (currentUser.tier === 'premium') return 'professional';
    if (currentUser.tier === 'professional') return 'elite';
    return null;
  };

  const getTierIndex = (tier: string): number => {
    const tiers = ['free', 'premium', 'professional', 'elite'];
    return tiers.indexOf(tier);
  };

  const nextTier = getNextTier();
  const currentTierIndex = getTierIndex(currentUser.tier);
  const currentStats = stats?.loyalty_points || 0;
  const currentTierPoints = TIER_POINTS[currentUser.tier as keyof typeof TIER_POINTS];
  const nextTierPoints = nextTier ? TIER_POINTS[nextTier as keyof typeof TIER_POINTS] : 0;
  const pointsInCurrentTier = currentStats - currentTierPoints;
  const pointsNeededForNextTier = nextTierPoints - currentTierPoints;
  const progressPercent = nextTier ? (pointsInCurrentTier / pointsNeededForNextTier) * 100 : 100;

  const handleUpgradeClick = (tier: string) => {
    if (!currentUser?.id) return;
    setSelectedUpgradeTier(tier as MembershipTier);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    if (!currentUser?.id || !selectedUpgradeTier) return;

    try {
      // Refetch user data from database to get latest tier
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileData) {
        setCurrentUser({
          id: currentUser.id,
          email: profileData.email,
          name: profileData.name,
          role: profileData.account_type as 'creator' | 'member',
          tier: profileData.tier as 'free' | 'premium' | 'professional' | 'elite',
          loyaltyPoints: profileData.loyalty_points || 0,
          joined_date: profileData.joined_date,
          profileImage: profileData.avatar_url,
        });

        setShowPaymentModal(false);
        setSelectedUpgradeTier(null);

        addToast(
          `Successfully upgraded to ${selectedUpgradeTier.charAt(0).toUpperCase() + selectedUpgradeTier.slice(1)}!`,
          'success'
        );
      }
    } catch (error) {
      console.error('Failed to refetch user data:', error);
      addToast('Upgrade completed, but failed to refresh data. Please refresh the page.', 'error');
    }
  };

  const handlePaymentError = (error: string) => {
    addToast(`Payment failed: ${error}`, 'error');
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-playfair font-bold text-white mb-2">Join Creators</h1>
          <p className="text-gray-300">Grow with your community – a better way to create</p>
        </div>

        {/* Current Tier Status Card */}
        <div className="mb-12 glass-effect p-8 rounded-2xl border border-white/10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Current Tier Display */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-gray-400 text-sm font-medium mb-2">YOUR CURRENT TIER</div>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-3 rounded-lg ${tierBenefits[currentUser.tier].bgColor}`}>
                    {tierBenefits[currentUser.tier].icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white capitalize">{currentUser.tier}</h2>
                    <p className="text-gray-400 text-sm">{tierBenefits[currentUser.tier].description}</p>
                  </div>
                </div>
              </div>
              {nextTier && (
                <button
                  onClick={() => handleUpgradeClick(nextTier)}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Unlock className="w-5 h-5" />
                  Upgrade to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
                </button>
              )}
            </div>

            {/* Loyalty Points Progress */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-gray-400 text-sm font-medium mb-4">LOYALTY POINTS PROGRESS</div>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-white mb-2">
                    {currentStats.toLocaleString()} / {nextTierPoints.toLocaleString()} points
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-400 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>
                {nextTier && (
                  <p className="text-gray-400 text-sm">
                    {Math.max(0, nextTierPoints - currentStats).toLocaleString()} points until {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
                  </p>
                )}
                {!nextTier && (
                  <p className="text-rose-400 text-sm font-medium">🎉 You've reached the highest tier!</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-xs font-medium mb-1">Member Since</div>
                  <div className="text-white font-semibold">{currentUser.joined_date ? new Date(currentUser.joined_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-gray-400 text-xs font-medium mb-1">Account Status</div>
                  <div className="text-white font-semibold capitalize">{currentUser.tier}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tier Comparison */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-8">Compare All Tiers</h2>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {Object.entries(tierBenefits).map(([tierKey, tierInfo]) => {
              const isCurrentTier = currentUser.tier === tierKey;
              const canUpgrade = getTierIndex(tierKey) > currentTierIndex;

              return (
                <div
                  key={tierKey}
                  className={`group glass-effect rounded-2xl overflow-hidden border transition-all ${
                    isCurrentTier
                      ? 'border-rose-400/50 ring-2 ring-rose-400/20'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Tier Badge */}
                  <div className={`p-6 text-center border-b border-white/10 ${tierInfo.bgColor}`}>
                    <div className="flex justify-center mb-3">
                      <div className={`p-3 rounded-lg bg-white/10`}>{tierInfo.icon}</div>
                    </div>
                    <h3 className="text-2xl font-bold text-white capitalize mb-2">{tierInfo.name}</h3>
                    <p className="text-gray-400 text-sm">{tierInfo.description}</p>
                  </div>

                  {/* Price */}
                  <div className="p-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1 justify-center mb-1">
                      <span className="text-3xl font-bold text-white">{tierInfo.price}</span>
                      <span className="text-gray-400 text-sm">{tierInfo.billing}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="p-6">
                    <ul className="space-y-3 mb-6">
                      {tierInfo.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Button */}
                    {isCurrentTier ? (
                      <button
                        disabled
                        className="w-full py-3 bg-white/5 text-gray-400 font-semibold rounded-lg cursor-default border border-white/10"
                      >
                        Current Tier
                      </button>
                    ) : canUpgrade ? (
                      <button
                        onClick={() => handleUpgradeClick(tierKey)}
                        disabled={upgrading === tierKey}
                        className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {upgrading === tierKey ? 'Upgrading...' : `Upgrade to ${tierInfo.name}`}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 bg-white/5 text-gray-400 font-semibold rounded-lg cursor-default border border-white/10 flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Lower tier
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Breakdown by Category */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-8">Feature Details</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Portfolio & Content */}
            <div className="glass-effect p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Portfolio & Content</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Unlimited Items</div>
                    <div className="text-gray-400 text-sm">Available from Premium tier</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Custom Branding</div>
                    <div className="text-gray-400 text-sm">Available from Professional tier</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">White-Label Portfolio</div>
                    <div className="text-gray-400 text-sm">Available from Elite tier</div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Analytics & Insights */}
            <div className="glass-effect p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Analytics & Insights</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Detailed Analytics</div>
                    <div className="text-gray-400 text-sm">Available from Premium tier</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">AI-Powered Insights</div>
                    <div className="text-gray-400 text-sm">Available from Professional tier</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Custom Reports</div>
                    <div className="text-gray-400 text-sm">Available from Elite tier</div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Support & Community */}
            <div className="glass-effect p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Support & Community</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Email Support</div>
                    <div className="text-gray-400 text-sm">Available in all tiers</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Priority Support 24/7</div>
                    <div className="text-gray-400 text-sm">Available from Professional tier</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Dedicated Account Manager</div>
                    <div className="text-gray-400 text-sm">Available from Elite tier</div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Opportunities & Growth */}
            <div className="glass-effect p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Award className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Opportunities & Growth</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Featured Discovery</div>
                    <div className="text-gray-400 text-sm">Available from Premium tier</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Exclusive Opportunities</div>
                    <div className="text-gray-400 text-sm">Available from Professional tier</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">VIP Events & Masterclasses</div>
                    <div className="text-gray-400 text-sm">Available from Elite tier</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-6">
            {[
              {
                q: 'Can I cancel my membership at any time?',
                a: 'Yes, you can cancel your subscription anytime without penalty. Your access will continue until the end of your billing period.',
              },
              {
                q: 'How do loyalty points work?',
                a: 'Loyalty points are earned through various activities like portfolio views, successful projects, and referrals. Accumulate points to unlock higher tiers and exclusive benefits.',
              },
              {
                q: 'Can I switch between tiers?',
                a: 'Yes, you can upgrade to a higher tier at any time. Downgrades are subject to a 30-day waiting period to maintain tier stability.',
              },
              {
                q: 'What payment methods are accepted?',
                a: 'We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through industry-standard encryption.',
              },
              {
                q: 'Is there a setup fee?',
                a: 'No, there are no hidden fees or setup charges. You only pay the monthly or annual subscription price for your chosen tier.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes, we offer a 14-day money-back guarantee if you\'re not satisfied with your membership. Contact support for more details.',
              },
            ].map((item, idx) => (
              <div key={idx} className="glass-effect p-6 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-rose-400">Q:</span> {item.q}
                </h3>
                <p className="text-gray-300 ml-6">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-effect p-12 rounded-2xl border border-white/10 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Level Up?</h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already growing with our premium features. Unlock your full potential today.
          </p>
          {nextTier && (
            <button
              onClick={() => handleUpgradeClick(nextTier)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              <Unlock className="w-5 h-5" />
              Upgrade Now to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          {!nextTier && (
            <div className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-rose-400 font-semibold rounded-lg border border-rose-400/30">
              <Trophy className="w-5 h-5" />
              You're at the highest tier!
            </div>
          )}
        </div>
      </div>

      {/* Membership Payment Modal - Production Ready */}
      {selectedUpgradeTier && (
        <MembershipPaymentModalV2
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedUpgradeTier(null);
          }}
          currentTier={currentUser.tier as MembershipTier}
          targetTier={selectedUpgradeTier}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          userName={currentUser.name || 'User'}
          userEmail={currentUser.email || ''}
          userId={currentUser.id}
          phoneNumber={currentUser.phoneNumber || ''}
          membershipType="creator"
        />
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 space-y-3 z-40">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-6 py-4 rounded-lg backdrop-blur-md border shadow-lg
              ${toast.type === 'success'
                ? 'bg-green-500/20 border-green-400/50 text-green-100'
                : 'bg-red-500/20 border-red-400/50 text-red-100'
              }
            `}
            style={{
              animation: 'slideIn 0.3s ease-out forwards',
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium text-sm md:text-base">{toast.message}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
