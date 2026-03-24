import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Lock,
  Shield,
  Clock,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { PaymentMethodType } from '../lib/paymentMethodConfig';
import {
  MembershipTier as CreatorTier,
  getTierPrice as getCreatorTierPrice,
  BillingCycle,
} from '../lib/tierPricingConfig';
import {
  MemberTier as MemberTier,
  getTierPrice as getMemberTierPrice,
  getTierConfig,
} from '../lib/memberTierPricingConfig';
import { PaymentOrchestration, PaymentInitRequest } from '../lib/paymentOrchestration';
import PaymentMethodSelector from './PaymentMethodSelector';

interface MembershipPaymentModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  currentTier: CreatorTier | MemberTier;
  targetTier: CreatorTier | MemberTier;
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
  userName: string;
  userEmail: string;
  userId: string;
  phoneNumber?: string;
  membershipType?: 'creator' | 'member';
}

type ModalStep =
  | 'billing'
  | 'payment-method'
  | 'review'
  | 'processing'
  | 'pending'
  | 'success'
  | 'error';

type StepConfig = {
  step: ModalStep;
  title: string;
  description: string;
  order: number;
};

const STEP_CONFIG: Record<ModalStep, StepConfig> = {
  billing: {
    step: 'billing',
    title: 'Select Billing Cycle',
    description: 'Choose monthly or annual subscription',
    order: 1,
  },
  'payment-method': {
    step: 'payment-method',
    title: 'Payment Method',
    description: 'Select how you want to pay',
    order: 2,
  },
  review: {
    step: 'review',
    title: 'Confirm Upgrade',
    description: 'Review your upgrade details',
    order: 3,
  },
  processing: {
    step: 'processing',
    title: 'Processing',
    description: 'Initializing payment',
    order: 0,
  },
  pending: {
    step: 'pending',
    title: 'Complete Payment',
    description: 'Waiting for payment confirmation',
    order: 0,
  },
  success: {
    step: 'success',
    title: 'Success',
    description: 'Your upgrade is complete',
    order: 0,
  },
  error: {
    step: 'error',
    title: 'Payment Failed',
    description: 'Please try again',
    order: 0,
  },
};

const PROGRESS_STEPS = ['billing', 'payment-method', 'review'] as const;

export default function MembershipPaymentModalV2({
  isOpen,
  onClose,
  currentTier,
  targetTier,
  onPaymentSuccess,
  onPaymentError,
  userName,
  userEmail,
  userId,
  phoneNumber = '',
  membershipType = 'creator',
}: MembershipPaymentModalV2Props) {
  const [step, setStep] = useState<ModalStep>('billing');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [pendingStartTime, setPendingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Get pricing based on membership type
  const getTierPrice = useMemo(() => {
    return membershipType === 'member' ? getMemberTierPrice : getCreatorTierPrice;
  }, [membershipType]);

  const monthlyPrice = getTierPrice(targetTier as any, 'monthly');
  const annualPrice = getTierPrice(targetTier as any, 'annual');
  const monthlyEquivalent = annualPrice / 12;
  const moneySaved = monthlyPrice * 12 - annualPrice;
  const savingsPercentage = Math.round((moneySaved / (monthlyPrice * 12)) * 100);

  const amount = billingCycle === 'monthly' ? monthlyPrice : annualPrice;

  // Get tier display name
  const getTargetTierDisplayName = () => {
    if (membershipType === 'member') {
      const config = getTierConfig(targetTier as MemberTier);
      return config.displayName;
    }
    return (targetTier as string).charAt(0).toUpperCase() + (targetTier as string).slice(1);
  };

  // Timer for pending state
  useEffect(() => {
    if (step !== 'pending') {
      setPendingStartTime(null);
      setElapsedTime(0);
      return;
    }

    if (!pendingStartTime) {
      setPendingStartTime(Date.now());
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (pendingStartTime || now)) / 1000);
      setElapsedTime(elapsed);

      // Timeout after 5 minutes
      if (elapsed > 300) {
        clearInterval(interval);
        setErrorMessage('Payment verification timed out. Please contact support.');
        setStep('error');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, pendingStartTime]);

  // Poll for payment status when waiting
  useEffect(() => {
    if (step !== 'pending' || !transactionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await PaymentOrchestration.getTransactionStatus(transactionId);

        if (status?.status === 'completed') {
          setStep('success');
          clearInterval(pollInterval);
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
        } else if (status?.status === 'failed') {
          setErrorMessage(status.error || 'Payment failed. Please try again.');
          setStep('error');
          clearInterval(pollInterval);
          if (onPaymentError) {
            onPaymentError(status.error || 'Payment failed');
          }
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [step, transactionId, onPaymentSuccess, onPaymentError]);

  const currentStepConfig = STEP_CONFIG[step];
  const currentStepOrder =
    step === 'billing'
      ? 1
      : step === 'payment-method'
        ? 2
        : step === 'review'
          ? 3
          : 0;

  const handleBack = () => {
    setErrorMessage(null);
    if (step === 'payment-method') {
      setStep('billing');
    } else if (step === 'review') {
      setStep('payment-method');
    }
  };

  const handleBillingContinue = () => {
    setErrorMessage(null);
    setStep('payment-method');
  };

  const handleMethodContinue = () => {
    setErrorMessage(null);
    setStep('review');
  };

  const handleReviewContinue = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const paymentRequest: PaymentInitRequest = {
        userId,
        currentTier: currentTier as any,
        targetTier: targetTier as any,
        amount,
        billingCycle,
        paymentMethod,
        email: userEmail,
        phoneNumber,
        userName,
        membershipType,
      };

      const result = await PaymentOrchestration.initializePayment(paymentRequest);

      if (!result.success) {
        setErrorMessage(
          result.error ||
            'Payment initialization failed. Please check your details and try again.'
        );
        setStep('error');
        if (onPaymentError) {
          onPaymentError(result.error || 'Payment initialization failed');
        }
        return;
      }

      if (result.transactionId) {
        setTransactionId(result.transactionId);
      }

      if (result.checkoutUrl) {
        setCheckoutUrl(result.checkoutUrl);
        setStep('processing');

        // Redirect to payment gateway after brief delay
        setTimeout(() => {
          window.location.href = result.checkoutUrl!;
        }, 2500);
      } else {
        setStep('pending');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An error occurred';
      setErrorMessage(errorMsg);
      setStep('error');
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (step === 'success' || (!isProcessing && step !== 'processing' && step !== 'pending')) {
      onClose();
      setStep('billing');
      setBillingCycle('monthly');
      setPaymentMethod('card');
      setErrorMessage(null);
      setTransactionId(null);
      setCheckoutUrl(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="glass-effect rounded-2xl border border-white/10 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 border-b border-white/10 px-6 py-4 sm:px-8 sm:py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 id="modal-title" className="text-xl sm:text-2xl font-bold text-white">
                {membershipType === 'member' ? 'Community Membership' : 'Creator Membership'} -{' '}
                {currentStepConfig.title}
              </h2>
              {step !== 'success' && step !== 'error' && (
                <p className="text-sm text-gray-400 mt-1">{currentStepConfig.description}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing || step === 'processing'}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress Indicator - Only for main steps */}
          {PROGRESS_STEPS.includes(step as any) && (
            <div className="flex items-center gap-2 mt-4">
              {PROGRESS_STEPS.map((s, index) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      PROGRESS_STEPS.indexOf(step as any) >= index
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < PROGRESS_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                        PROGRESS_STEPS.indexOf(step as any) > index ? 'bg-rose-500' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
          {/* Step 1: Billing Cycle */}
          {step === 'billing' && (
            <div className="space-y-6">
              {/* Current Tier Info */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs sm:text-sm text-gray-400 mb-2">Current Tier</p>
                <p className="text-lg sm:text-xl font-semibold text-white capitalize">
                  {membershipType === 'member'
                    ? getTierConfig(currentTier as MemberTier).displayName
                    : (currentTier as string).charAt(0).toUpperCase() + (currentTier as string).slice(1)}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
              </div>

              {/* Billing Options */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-200">Choose Your Subscription</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Monthly */}
                  <label
                    className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'border-rose-400 bg-rose-400/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-700/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="billing"
                      value="monthly"
                      checked={billingCycle === 'monthly'}
                      onChange={() => setBillingCycle('monthly')}
                      className="sr-only"
                      aria-label="Monthly subscription"
                    />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-white">Monthly</p>
                        {billingCycle === 'monthly' && (
                          <div className="w-5 h-5 rounded-full bg-rose-500" />
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white">${monthlyPrice.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">per month, cancel anytime</p>
                    </div>
                  </label>

                  {/* Annual */}
                  <label
                    className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ring-2 ring-green-500/50 ${
                      billingCycle === 'annual'
                        ? 'border-green-400 bg-green-400/10'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-700/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="billing"
                      value="annual"
                      checked={billingCycle === 'annual'}
                      onChange={() => setBillingCycle('annual')}
                      className="sr-only"
                      aria-label="Annual subscription"
                    />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-white">Annual</p>
                        {billingCycle === 'annual' && (
                          <div className="w-5 h-5 rounded-full bg-green-500" />
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white">${monthlyEquivalent.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">per month, billed annually</p>
                      <div className="flex items-center gap-1 pt-2">
                        <span className="inline-block px-2 py-1 bg-green-500/20 text-green-300 text-xs font-semibold rounded">
                          Save {savingsPercentage}%
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Savings Breakdown - Only show for annual */}
              {billingCycle === 'annual' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-300">You Save</p>
                  <p className="text-2xl font-bold text-white">${moneySaved.toFixed(2)}</p>
                  <p className="text-xs text-green-200">
                    That's ${(moneySaved / 12).toFixed(2)} per month compared to monthly billing
                  </p>
                </div>
              )}

              {/* Price Summary */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {billingCycle === 'monthly' ? 'Monthly charge' : 'Annual charge'}
                  </span>
                  <span className="text-white font-semibold">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    Upgrade to{' '}
                    {membershipType === 'member'
                      ? getTierConfig(targetTier as MemberTier).displayName
                      : (targetTier as string).charAt(0).toUpperCase() + (targetTier as string).slice(1)}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-semibold">Total Due Today</span>
                  <span className="text-rose-400 font-bold text-lg">${amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 'payment-method' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-xs sm:text-sm text-gray-400 mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-white">${amount.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {billingCycle === 'monthly' ? 'Monthly' : 'Annual'} billing
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-4">
                  Select Payment Method
                </label>
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onMethodChange={setPaymentMethod}
                  currency="USD"
                />
              </div>

              {/* Security & Trust */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-200">
                    <p className="font-semibold mb-1">SSL Encrypted & Secure</p>
                    <p>Your payment is processed securely by PCI-DSS compliant providers.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <Lock className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-green-200">
                    <p className="font-semibold mb-1">Industry-Leading Providers</p>
                    <p>Powered by Eversend and Flutterwave - trusted by millions.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              {/* Upgrade Summary */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-xs text-gray-400 mb-3">Upgrade Summary</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Current Tier</span>
                      <span className="font-semibold text-white">
                        {membershipType === 'member'
                          ? getTierConfig(currentTier as MemberTier).displayName
                          : (currentTier as string).charAt(0).toUpperCase() + (currentTier as string).slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">New Tier</span>
                      <span className="font-semibold text-rose-400">{getTargetTierDisplayName()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                <p className="text-xs text-gray-400 mb-3">Payment Details</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Amount</span>
                  <span className="font-semibold text-white">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Billing Cycle</span>
                  <span className="font-semibold text-white capitalize">{billingCycle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Payment Method</span>
                  <span className="font-semibold text-white capitalize">
                    {paymentMethod.replace('_', ' ')}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-semibold">Total Due Today</span>
                  <span className="text-rose-400 font-bold text-lg">${amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Terms */}
              <p className="text-xs text-gray-400 text-center">
                By confirming, you agree to our{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                  Privacy Policy
                </a>
                . You can cancel anytime.
              </p>
            </div>
          )}

          {/* Processing State */}
          {step === 'processing' && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-rose-500/20 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-white">Initializing Payment</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Please wait while we redirect you to our secure payment page...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pending State */}
          {step === 'pending' && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-6 max-w-sm">
                <div className="flex justify-center">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-lg font-bold text-blue-400">
                        {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-white text-lg">Completing Payment</p>
                  <p className="text-sm text-gray-400 mt-2">
                    We're waiting for payment confirmation from your provider.
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-200">
                      <p className="font-semibold mb-1">Don't close this window</p>
                      <p>We'll automatically update when payment is confirmed (usually within seconds).</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('review')}
                  className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Back to Review
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-6 max-w-sm">
                <div className="flex justify-center">
                  <div className="p-4 bg-green-500/20 rounded-full">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </div>
                </div>

                <div>
                  <p className="font-bold text-white text-xl">
                    {membershipType === 'member' ? 'Membership' : 'Upgrade'} Successful!
                  </p>
                  <p className="text-sm text-gray-300 mt-2">
                    Welcome to {getTargetTierDisplayName()}. Your account has been upgraded.
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-left space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">New Tier</span>
                    <span className="text-white font-semibold">{getTargetTierDisplayName()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Amount Paid</span>
                    <span className="text-white font-semibold">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Billing Cycle</span>
                    <span className="text-white font-semibold capitalize">{billingCycle}</span>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-left">
                  <p className="text-sm font-semibold text-blue-300 mb-2">What's Next?</p>
                  <ul className="text-xs text-blue-200 space-y-1">
                    <li>✓ Check your email for a receipt and invoice</li>
                    <li>✓ Your new features are available immediately</li>
                    <li>✓ You can manage your subscription in Account Settings</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-6 max-w-sm">
                <div className="flex justify-center">
                  <div className="p-4 bg-red-500/20 rounded-full">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                  </div>
                </div>

                <div>
                  <p className="font-bold text-white text-xl">Payment Failed</p>
                  <p className="text-sm text-red-300 mt-2">{errorMessage}</p>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-xs text-red-200">
                    <span className="font-semibold">Troubleshooting:</span> Make sure your payment details
                    are correct and your account has sufficient funds. If the problem persists, contact
                    support.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Sticky */}
        <div className="flex-shrink-0 border-t border-white/10 px-6 py-4 sm:px-8 sm:py-6 bg-black/20">
          {step === 'billing' && (
            <button
              onClick={handleBillingContinue}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-rose-500/50 transition-all"
              aria-label="Continue to payment method selection"
            >
              Continue to Payment Method
            </button>
          )}

          {step === 'payment-method' && (
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                aria-label="Go back to billing cycle selection"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleMethodContinue}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-rose-500/50 transition-all"
                aria-label="Continue to review payment"
              >
                Review Order
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                aria-label="Go back to payment method selection"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleReviewContinue}
                disabled={isProcessing}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-rose-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Complete payment"
              >
                {isProcessing ? 'Processing...' : 'Confirm & Pay'}
              </button>
            </div>
          )}

          {step === 'success' && (
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-rose-500/50 transition-all"
              aria-label="Close and finish"
            >
              Close & Continue
            </button>
          )}

          {step === 'error' && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setStep('review');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-rose-500/50 transition-all"
                aria-label="Try payment again"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Cancel payment"
              >
                Cancel
              </button>
            </div>
          )}

          {(step === 'processing' || step === 'pending') && (
            <p className="text-xs text-gray-400 text-center">Please don't close this window</p>
          )}
        </div>
      </div>
    </div>
  );
}
