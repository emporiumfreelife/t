import React, { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEnrollment } from '../hooks/useEnrollment';
import { supabase } from '../lib/supabase';
import { validatePromoCode } from '../lib/promoCodeService';
import { PaymentMethodType, selectGateway } from '../lib/paymentMethodConfig';
import { Country, getCountryByCode, COUNTRIES } from '../lib/countries';
import PaymentMethodSelector from './PaymentMethodSelector';
import CountryPhoneSelector from './CountryPhoneSelector';
import CardPaymentForm, { CardData } from './CardPaymentForm';
import MobileMoneyPaymentForm, { MobileMoneyData } from './MobileMoneyPaymentForm';
import ExpressPaymentForm, { ExpressPaymentData } from './ExpressPaymentForm';

interface Course {
  id: string;
  title: string;
  thumbnail_url: string;
  is_premium: boolean;
  creator: string;
}

interface EnrollmentModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onEnrollmentComplete: () => void;
}

type Step = 'details' | 'payment_method' | 'payment_form' | 'processing' | 'success' | 'error';

export default function EnrollmentModal({
  course,
  isOpen,
  onClose,
  onEnrollmentComplete,
}: EnrollmentModalProps) {
  const { user, profile } = useAuth();
  const { initiateEnrollment, isLoading } = useEnrollment();

  const [step, setStep] = useState<Step>('details');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formData, setFormData] = useState({
    firstName: profile?.name?.split(' ')[0] || '',
    lastName: profile?.name?.split(' ')[1] || '',
    email: profile?.email || '',
    phoneNumber: '',
    country: '',
    city: '',
    address: '',
  });
  const [coursePrice, setCoursePrice] = useState<number>(0);
  const [courseCurrency, setCourseCurrency] = useState<string>('UGX');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<{ percentage?: number; amount?: number } | null>(null);
  const [finalPrice, setFinalPrice] = useState<number>(0);

  // Fetch course price and currency from database
  useEffect(() => {
    if (!isOpen || !course.id) return;

    const fetchCoursePriceAndCurrency = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('masterclass_page_content')
          .select('course_price, course_currency')
          .eq('id', course.id)
          .single();

        if (!fetchError && data) {
          setCoursePrice(data.course_price || 0);
          setFinalPrice(data.course_price || 0);
          setCourseCurrency(data.course_currency || 'UGX');
        }
      } catch (err) {
        console.error('Error fetching course price and currency:', err);
        setCoursePrice(0);
        setFinalPrice(0);
        setCourseCurrency('UGX');
      }
    };

    fetchCoursePriceAndCurrency();
  }, [isOpen, course.id]);

  // Validate promo code
  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setPromoError('Enter a promo code');
      return;
    }

    setPromoValidating(true);
    setPromoError(null);

    const result = await validatePromoCode(promoCode, course.id, coursePrice);

    if (result.valid && result.final_price !== undefined) {
      setPromoDiscount({
        percentage: result.discount_percentage,
        amount: result.discount_amount,
      });
      setFinalPrice(result.final_price);
      setPromoError(null);
    } else {
      setPromoError(result.error || 'Invalid promo code');
      setPromoDiscount(null);
      setFinalPrice(coursePrice);
    }

    setPromoValidating(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setErrorMessage('First name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Email is required');
      return false;
    }
    return true;
  };

  const handleProceedToPayment = () => {
    setErrorMessage(null);
    if (!validateForm()) return;

    // For free courses, skip to success
    if (coursePrice === 0) {
      handleFreeEnrollment();
    } else {
      // For paid courses, show payment method selection
      setStep('payment_method');
    }
  };

  const handlePaymentMethodSelected = () => {
    setStep('payment_form');
  };

  const handleCardPayment = async (_cardData: CardData) => {
    if (!user) {
      setErrorMessage('User not authenticated');
      return;
    }

    setErrorMessage(null);
    await processPaidEnrollment();
  };

  const handleMobileMoneyPayment = async (_mobileData: MobileMoneyData) => {
    if (!user) {
      setErrorMessage('User not authenticated');
      return;
    }

    setErrorMessage(null);
    await processPaidEnrollment();
  };

  const handleExpressPayPayment = async (_expressData: ExpressPaymentData) => {
    if (!user) {
      setErrorMessage('User not authenticated');
      return;
    }

    setErrorMessage(null);
    await processPaidEnrollment();
  };

  const processPaidEnrollment = async () => {
    if (!user) {
      setErrorMessage('User not authenticated');
      return;
    }

    // Check if migrations have been run
    try {
      const { error: testError } = await supabase
        .from('student_enrollments')
        .select('id')
        .limit(1);

      if (testError && testError.code === 'PGRST116') {
        setErrorMessage('Database setup required. Please run the 3 SQL migrations from the database folder first.');
        setStep('error');
        return;
      }
    } catch (err) {
      console.error('Database check failed:', err);
    }

    setStep('processing');

    try {
      const userName = `${formData.firstName} ${formData.lastName}`.trim();
      const useEversend = selectGateway(paymentMethod) === 'eversend';

      const result = await initiateEnrollment(
        user.id,
        course.id,
        finalPrice,
        formData.email,
        userName,
        formData.phoneNumber,
        useEversend
      );

      if (!result.success) {
        setErrorMessage(result.error || 'Payment initialization failed');
        setStep('error');
        return;
      }

      setEnrollmentId(result.enrollmentId || null);

      // If payment link not generated, complete enrollment
      if (!result.paymentUrl) {
        setStep('success');
        setTimeout(() => {
          onEnrollmentComplete();
          onClose();
        }, 2000);
        return;
      }

      // For paid courses, redirect to payment provider
      if (result.paymentUrl) {
        sessionStorage.setItem(
          'pendingEnrollment',
          JSON.stringify({
            enrollmentId: result.enrollmentId,
            courseId: course.id,
            userId: user.id,
            paymentMethod: selectGateway(paymentMethod),
          })
        );

        window.location.href = result.paymentUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setErrorMessage(message);
      setStep('error');
    }
  };

  const handleFreeEnrollment = async () => {
    if (!user) {
      setErrorMessage('User not authenticated');
      return;
    }

    setStep('processing');

    try {
      const userName = `${formData.firstName} ${formData.lastName}`.trim();

      const result = await initiateEnrollment(
        user.id,
        course.id,
        0,
        formData.email,
        userName,
        formData.phoneNumber,
        false
      );

      if (!result.success) {
        setErrorMessage(result.error || 'Enrollment failed');
        setStep('error');
        return;
      }

      setStep('success');
      setTimeout(() => {
        onEnrollmentComplete();
        onClose();
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Enrollment failed';
      setErrorMessage(message);
      setStep('error');
    }
  };

  const handleClose = () => {
    if (step !== 'processing') {
      setStep('details');
      setFormData({
        firstName: profile?.name?.split(' ')[0] || '',
        lastName: profile?.name?.split(' ')[1] || '',
        email: profile?.email || '',
        phoneNumber: '',
        country: '',
        city: '',
        address: '',
      });
      setSelectedCountry(null);
      setErrorMessage(null);
      setEnrollmentId(null);
      setPaymentMethod('card');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl p-8 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {step === 'details' && 'Enrollment Details'}
            {step === 'payment_method' && 'Select Payment Method'}
            {step === 'payment_form' && 'Complete Payment'}
            {step === 'processing' && 'Processing...'}
            {step === 'success' && 'Enrollment Complete!'}
            {step === 'error' && 'Enrollment Failed'}
          </h2>
          <button
            onClick={handleClose}
            disabled={step === 'processing'}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Course Summary */}
        {step !== 'success' && step !== 'error' && (
          <div className="mb-8 p-5 bg-slate-700/30 border border-slate-600/50 rounded-xl">
            <div className="flex gap-4 mb-3">
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-20 h-20 rounded-lg object-cover shadow-md"
              />
              <div>
                <h3 className="text-white font-semibold text-sm">{course.title}</h3>
                <p className="text-gray-400 text-xs mt-1">by {course.creator}</p>
                {coursePrice > 0 && (
                  <div className="mt-2 space-y-1">
                    {promoDiscount ? (
                      <>
                        <p className="text-gray-400 text-xs line-through">{courseCurrency} {coursePrice.toLocaleString()}</p>
                        <p className="text-green-400 font-bold text-sm">{courseCurrency} {finalPrice.toLocaleString()}</p>
                      </>
                    ) : (
                      <p className="text-rose-400 font-bold text-sm">{courseCurrency} {coursePrice.toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Enrollment Details */}
        {step === 'details' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProceedToPayment();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
                placeholder="Enter your first name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
                placeholder="Enter your last name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            {coursePrice > 0 && (
              <>
                <CountryPhoneSelector
                  selectedCountry={selectedCountry}
                  onCountrySelect={(country) => {
                    setSelectedCountry(country);
                    setFormData((prev) => ({ ...prev, country: country.name }));
                  }}
                  phoneNumber={formData.phoneNumber.replace(/^\+\d{1,3}/, '')}
                  onPhoneChange={(phone) => {
                    const fullPhoneNumber = selectedCountry ? `${selectedCountry.phoneCode}${phone}` : phone;
                    setFormData((prev) => ({ ...prev, phoneNumber: fullPhoneNumber }));
                  }}
                />

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
                    placeholder="Select a country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">City/Region</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
                    placeholder="Enter your city or region"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
                    placeholder="Enter your address"
                  />
                </div>
              </>
            )}


            {errorMessage && (
              <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-2xl hover:from-rose-600 hover:to-purple-700 transition-all"
            >
              {coursePrice === 0 ? (
                'Complete Enrollment'
              ) : (
                <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2 sm:justify-center">
                  <span>Proceed to Payment -</span>
                  <span className="whitespace-nowrap">{courseCurrency} {promoDiscount ? finalPrice.toLocaleString() : coursePrice.toLocaleString()}</span>
                </div>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Payment Method Selection */}
        {step === 'payment_method' && coursePrice > 0 && (
          <div className="space-y-6">
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={setPaymentMethod}
              currency={courseCurrency}
            />

            <div className="space-y-3 pt-2">
              <button
                onClick={() => setStep('details')}
                className="w-full py-3 bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handlePaymentMethodSelected}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-2xl hover:from-rose-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Form */}
        {step === 'payment_form' && coursePrice > 0 && (
          <div className="space-y-6">
            {/* Promo Code Section */}
            <div className="p-5 bg-slate-700/30 border border-slate-600/50 rounded-xl">
              <label className="block text-sm font-semibold text-slate-200 mb-3">Promo Code (Optional)</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      setPromoError(null);
                      setPromoDiscount(null);
                      setFinalPrice(coursePrice);
                    }}
                    className="w-full px-4 py-3 bg-slate-700/40 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all"
                    placeholder="Enter promo code"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleValidatePromo}
                  disabled={promoValidating || !promoCode.trim()}
                  className="px-5 py-3 bg-purple-500/30 hover:bg-purple-500/40 text-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold border border-purple-500/30"
                >
                  {promoValidating ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {promoError && (
                <p className="text-red-400 text-xs mt-2">{promoError}</p>
              )}
              {promoDiscount && (
                <p className="text-green-400 text-xs mt-2">✓ Promo code applied!</p>
              )}
            </div>

            {paymentMethod === 'card' && (
              <CardPaymentForm
                amount={finalPrice}
                onSubmit={handleCardPayment}
                isProcessing={isLoading}
                currency={courseCurrency}
              />
            )}

            {paymentMethod === 'mobile_money' && (
              <MobileMoneyPaymentForm
                amount={finalPrice}
                onSubmit={handleMobileMoneyPayment}
                isProcessing={isLoading}
                currency={courseCurrency}
              />
            )}

            {paymentMethod === 'express_pay' && (
              <ExpressPaymentForm
                amount={finalPrice}
                onSubmit={handleExpressPayPayment}
                isProcessing={isLoading}
                currency={courseCurrency}
              />
            )}

            <button
              onClick={() => setStep('payment_method')}
              className="w-full py-2 text-slate-400 text-sm hover:text-slate-300 transition-colors font-medium"
            >
              ← Change payment method
            </button>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-12 h-12 text-rose-400 animate-spin mb-4" />
            <p className="text-white text-center">Processing your enrollment...</p>
            <p className="text-gray-400 text-sm mt-2">Please wait, do not close this window</p>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
            <p className="text-gray-300 mb-4">
              You've successfully enrolled in {course.title}
            </p>
            <p className="text-gray-400 text-sm">Redirecting you to the course...</p>
          </div>
        )}

        {/* Step 6: Error */}
        {step === 'error' && (
          <div className="space-y-6">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-red-400" />
            </div>
            <p className="text-white text-center font-semibold text-lg">Enrollment Failed</p>
            {errorMessage && (
              <p className="text-slate-300 text-center text-sm">{errorMessage}</p>
            )}

            <div className="space-y-3 pt-4">
              <button
                onClick={() => setStep('details')}
                className="w-full py-3 bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={handleClose}
                className="w-full py-3 bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
