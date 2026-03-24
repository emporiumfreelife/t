import React, { useState, useEffect } from 'react';
import {
  Crown,
  Users,
  Check,
  Zap,
  MessageSquare,
  Gift,
  Sparkles,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  MemberTier,
  getTierConfig,
  getTierPrice,
  getAllTiers,
  getTierBenefits,
  calculateSavings,
  isValidTierUpgrade,
} from '../lib/memberTierPricingConfig';
import MembershipPaymentModalV2 from '../components/MembershipPaymentModalV2';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
  duration?: number;
}

const TIER_COLORS: Record<
  MemberTier,
  { color: string; bgColor: string; icon: React.ReactNode; accentColor: string }
> = {
  welcome: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    accentColor: 'from-blue-500 to-blue-600',
    icon: <Users className="w-8 h-8 text-blue-400" />,
  },
  premium: {
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    accentColor: 'from-purple-500 to-purple-600',
    icon: <Sparkles className="w-8 h-8 text-purple-400" />,
  },
  elite: {
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    accentColor: 'from-rose-500 to-rose-600',
    icon: <Crown className="w-8 h-8 text-rose-400" />,
  },
  enterprise: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    accentColor: 'from-yellow-500 to-orange-600',
    icon: <TrendingUp className="w-8 h-8 text-yellow-400" />,
  },
};

export default function MembersMembership() {
  const { user } = useAuth();
  const [currentMemberTier, setCurrentMemberTier] = useState<MemberTier>('welcome');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<MemberTier>('premium');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Load current membership tier
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadMembershipStatus();
  }, [user]);

  const loadMembershipStatus = async () => {
    try {
      setLoading(true);
      // Fetch user's current membership tier
      const { data, error } = await supabase
        .from('members_membership')
        .select('new_tier, status')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No data found or other error - user hasn't purchased membership yet
        setCurrentMemberTier('welcome');
        setHasActiveSubscription(false);
      } else if (data) {
        setCurrentMemberTier(data.new_tier as MemberTier);
        setHasActiveSubscription(true);
      } else {
        setCurrentMemberTier('welcome');
        setHasActiveSubscription(false);
      }
    } catch (error) {
      console.error('Error loading membership status:', error);
      setCurrentMemberTier('welcome');
      setHasActiveSubscription(false);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSelectTier = (tier: MemberTier) => {
    if (tier === currentMemberTier && hasActiveSubscription) {
      addToast('You are already on this tier', 'error');
      return;
    }
    setSelectedTier(tier);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    addToast('Welcome to the community! Your membership is active. 🎉', 'success');
    await loadMembershipStatus();
  };

  const handlePaymentError = (error: string) => {
    addToast(`Payment failed: ${error}`, 'error');
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto text-center py-20">
          <h1 className="text-4xl font-bold text-white mb-4">Community Membership</h1>
          <p className="text-gray-400 mb-8">Please sign in to access community membership options</p>
        </div>
      </div>
    );
  }

  const allTiers = getAllTiers();

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-playfair font-bold text-white mb-2">Join Members</h1>
          <p className="text-gray-300">Empower creators. Enhance your experience. Build a better platform for everyone</p>
        </div>

        {/* Current Status Banner */}
        {hasActiveSubscription && (
          <div className="mb-12 p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-green-300 font-medium">You're Supporting Creators</p>
                  <p className="text-lg font-semibold text-white">
                    {getTierConfig(currentMemberTier).displayName} Member
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Your tier</p>
              </div>
            </div>
          </div>
        )}

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {allTiers.map((tier) => {
            const config = getTierConfig(tier);
            const monthlyPrice = getTierPrice(tier, 'monthly');
            const annualPrice = getTierPrice(tier, 'annual');
            const savings = calculateSavings(tier);
            const tierColors = TIER_COLORS[tier];
            const isCurrentTier = tier === currentMemberTier && hasActiveSubscription;

            return (
              <div
                key={tier}
                className={`relative rounded-2xl border-2 transition-all overflow-hidden group ${
                  isCurrentTier
                    ? 'border-green-500 bg-gradient-to-b from-green-500/15 to-slate-900'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                {/* Current Tier Badge */}
                {isCurrentTier && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                    <p className="text-xs font-semibold text-white flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Active Tier
                    </p>
                  </div>
                )}

                <div className="p-8">
                  {/* Tier Icon & Name */}
                  <div className="mb-6">
                    <div
                      className={`w-16 h-16 ${tierColors.bgColor} rounded-xl flex items-center justify-center mb-4 border border-white/10`}
                    >
                      {tierColors.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{config.displayName}</h3>
                    <p className="text-gray-400 text-sm">{config.description}</p>
                  </div>

                  {/* Pricing Section */}
                  <div className="mb-8 pb-8 border-b border-white/10">
                    <div className="mb-4">
                      <span className="text-5xl font-bold text-white">${monthlyPrice}</span>
                      <span className="text-gray-400 ml-2">/month</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">Or ${annualPrice}/year (billed annually)</p>
                    {savings.percentage > 0 && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-xs text-emerald-400 font-semibold">
                          ✓ Save ${savings.amount.toFixed(2)} ({savings.percentage}%) with annual billing
                        </p>
                      </div>
                    )}
                  </div>

                  {/* What's Included */}
                  <div className="mb-8">
                    <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      What's Included:
                    </p>
                    <ul className="space-y-3">
                      {getTierBenefits(tier).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleSelectTier(tier)}
                    disabled={isCurrentTier}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      isCurrentTier
                        ? 'bg-white/10 text-gray-300 cursor-not-allowed border border-white/10'
                        : `bg-gradient-to-r ${tierColors.accentColor} text-white hover:shadow-xl hover:shadow-${tierColors.color}/50 transform hover:scale-105`
                    }`}
                  >
                    {isCurrentTier ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Your Current Tier
                      </>
                    ) : hasActiveSubscription && isValidTierUpgrade(currentMemberTier, tier) ? (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        Upgrade Now
                      </>
                    ) : (
                      <>
                        <Users className="w-5 h-5" />
                        Join Community
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* How Community Membership Works */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white mb-10 text-center">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4 p-6 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center border border-blue-400/30">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Choose Your Tier</h3>
                <p className="text-gray-400">
                  Select a membership tier that matches your commitment to supporting creators. Each tier provides different ways to make an impact.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center border border-purple-400/30">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Support Creators</h3>
                <p className="text-gray-400">
                  Complete your membership securely. Your funds directly support creator resources, platform improvements, and community growth initiatives.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center border border-rose-400/30">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Enhance Your Experience</h3>
                <p className="text-gray-400">
                  Unlock exclusive member benefits, connect with creators, access premium resources, and become part of building a better platform.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why Join Section */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-white mb-10 text-center">Why Join as a Member?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl text-center hover:border-blue-500/50 transition-all">
              <div className="inline-block p-3 bg-blue-500/20 rounded-lg mb-4">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Support Creators</h3>
              <p className="text-sm text-gray-400">Direct your support to fuel creator growth and innovation</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl text-center hover:border-purple-500/50 transition-all">
              <div className="inline-block p-3 bg-purple-500/20 rounded-lg mb-4">
                <Lightbulb className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Creator Resources</h3>
              <p className="text-sm text-gray-400">Access exclusive tools and knowledge to grow creators</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl text-center hover:border-emerald-500/50 transition-all">
              <div className="inline-block p-3 bg-emerald-500/20 rounded-lg mb-4">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Member Community</h3>
              <p className="text-sm text-gray-400">Connect with like-minded supporters of the platform</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-rose-500/10 to-rose-600/5 border border-rose-500/30 rounded-xl text-center hover:border-rose-500/50 transition-all">
              <div className="inline-block p-3 bg-rose-500/20 rounded-lg mb-4">
                <Gift className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Member Rewards</h3>
              <p className="text-sm text-gray-400">Unlock exclusive discounts and benefits for your support</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-10 text-center">Common Questions</h2>
          <div className="space-y-4">
            <details className="group border border-white/10 rounded-lg p-6 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-white group-open:text-rose-400">
                Can I change my membership tier?
                <span className="text-gray-400 group-open:text-rose-400 transition-transform transform group-open:rotate-180">▼</span>
              </summary>
              <p className="text-gray-300 mt-4">
                Absolutely! You can upgrade your membership tier anytime to unlock additional benefits. The new benefits will be available immediately after payment confirmation.
              </p>
            </details>

            <details className="group border border-white/10 rounded-lg p-6 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-white group-open:text-rose-400">
                What payment methods do you accept?
                <span className="text-gray-400 group-open:text-rose-400 transition-transform transform group-open:rotate-180">▼</span>
              </summary>
              <p className="text-gray-300 mt-4">
                We accept credit/debit cards, mobile money, and express payments through our secure payment partners (Eversend and Flutterwave). Your payment information is handled securely.
              </p>
            </details>

            <details className="group border border-white/10 rounded-lg p-6 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-white group-open:text-rose-400">
                Is there a cancellation policy?
                <span className="text-gray-400 group-open:text-rose-400 transition-transform transform group-open:rotate-180">▼</span>
              </summary>
              <p className="text-gray-300 mt-4">
                Yes, you can manage your subscription anytime. If you have questions about our cancellation policy, please contact our support team for assistance.
              </p>
            </details>

            <details className="group border border-white/10 rounded-lg p-6 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
              <summary className="flex justify-between items-center font-semibold text-white group-open:text-rose-400">
                How does my membership support the community?
                <span className="text-gray-400 group-open:text-rose-400 transition-transform transform group-open:rotate-180">▼</span>
              </summary>
              <p className="text-gray-300 mt-4">
                Your membership funds creator resources, platform development, creator support tools, and initiatives to build a thriving ecosystem where creators can succeed and members can enhance their experience.
              </p>
            </details>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <MembershipPaymentModalV2
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        membershipType="member"
        currentTier={currentMemberTier}
        targetTier={selectedTier}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
        userName={user?.user_metadata?.full_name || 'Member'}
        userEmail={user?.email || ''}
        userId={user?.id || ''}
        phoneNumber={user?.phone || ''}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg text-white flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success'
                ? 'bg-green-500/20 border-green-500/30'
                : 'bg-red-500/20 border-red-500/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
