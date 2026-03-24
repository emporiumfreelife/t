import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Info, Smartphone } from 'lucide-react';

interface MobileMoneyPaymentFormProps {
  amount: number;
  onSubmit: (mobileData: MobileMoneyData) => Promise<void>;
  isProcessing: boolean;
  currency?: string;
}

export interface MobileMoneyData {
  phoneNumber: string;
  provider: string;
}

export default function MobileMoneyPaymentForm({
  amount,
  onSubmit,
  isProcessing,
  currency = 'UGX',
}: MobileMoneyPaymentFormProps) {
  const [mobileData, setMobileData] = useState<MobileMoneyData>({
    phoneNumber: '',
    provider: 'mtn_mobile_money',
  });

  const [errors, setErrors] = useState<Partial<MobileMoneyData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mobileProviders = [
    { id: 'mtn_mobile_money', name: 'MTN Mobile Money', hint: 'MTN Uganda' },
    { id: 'airtel_money', name: 'Airtel Money', hint: 'Airtel Uganda' },
    { id: 'mpesa', name: 'M-Pesa', hint: 'Safaricom' },
  ];

  const getPhonePlaceholder = () => {
    switch (mobileData.provider) {
      case 'mtn_mobile_money':
        return '+256701234567';
      case 'airtel_money':
        return '+256701234567';
      case 'mpesa':
        return '+254701234567';
      default:
        return '+256701234567';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<MobileMoneyData> = {};

    // Validate phone number (must start with +)
    const phoneRegex = /^\+[0-9]{12}$/;
    if (!mobileData.phoneNumber.match(phoneRegex)) {
      newErrors.phoneNumber = 'Enter valid phone number (e.g., +256701234567)';
    }

    if (!mobileData.provider.trim()) {
      newErrors.provider = 'Select a mobile money provider';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Allow only digits, +, and spaces
    value = value.replace(/[^\d\s+]/g, '');
    setMobileData({ ...mobileData, phoneNumber: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(mobileData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Mobile Money Provider Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3">Select Provider</label>
        <div className="grid grid-cols-1 gap-2">
          {mobileProviders.map((provider) => (
            <label
              key={provider.id}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                mobileData.provider === provider.id
                  ? 'border-rose-400 bg-rose-400/10'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={mobileData.provider === provider.id}
                onChange={(e) =>
                  setMobileData({ ...mobileData, provider: e.target.value })
                }
                disabled={isProcessing || isSubmitting}
                className="w-4 h-4"
              />
              <Smartphone className="w-5 h-5 text-slate-300" />
              <div>
                <p className="text-white font-medium text-sm">{provider.name}</p>
                <p className="text-slate-400 text-xs">{provider.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Phone Number Input */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">Phone Number</label>
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder={getPhonePlaceholder()}
            value={mobileData.phoneNumber}
            onChange={handlePhoneChange}
            disabled={isProcessing || isSubmitting}
            className={`flex-1 px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
              errors.phoneNumber ? 'border-red-500' : 'border-slate-600/50'
            }`}
          />
        </div>
        {errors.phoneNumber && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.phoneNumber}
          </p>
        )}
        <p className="text-slate-400 text-xs mt-2">Format: +256XXXXXXXXX</p>
      </div>

      {/* Guidance */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-2">Guidance:</p>
            <p>Use the Pay button below and get the notification on your phone to complete payment.</p>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-green-300">
          This transaction is protected with industry standard security.
        </p>
      </div>

      <button
        type="submit"
        disabled={isProcessing || isSubmitting}
        className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-2xl hover:from-rose-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Processing Payment...' : `Pay ${currency} ${amount.toLocaleString()}`}
      </button>
    </form>
  );
}
