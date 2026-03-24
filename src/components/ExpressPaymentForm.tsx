import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ExpressPaymentFormProps {
  amount: number;
  onSubmit: (expressData: ExpressPaymentData) => Promise<void>;
  isProcessing: boolean;
  currency?: string;
}

export interface ExpressPaymentData {
  provider: 'paypal' | 'google_pay' | 'apple_pay';
}

export default function ExpressPaymentForm({
  amount,
  onSubmit,
  isProcessing,
  currency = 'UGX',
}: ExpressPaymentFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<'paypal' | 'google_pay' | 'apple_pay' | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expressProviders = [
    {
      id: 'paypal',
      name: 'PayPal',
      image: 'https://f003.backblazeb2.com/file/houzing/admin1images/b+(1).png',
      description: 'Fast and secure',
    },
    {
      id: 'google_pay',
      name: 'Google Pay',
      image: 'https://f003.backblazeb2.com/file/houzing/admin1images/b+(3).png',
      description: 'Quick checkout',
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      image: 'https://f003.backblazeb2.com/file/houzing/admin1images/b+(2).png',
      description: 'Seamless payments',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProvider) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        provider: selectedProvider,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-3">Select Pay Provider</label>
        <div className="grid grid-cols-1 gap-3">
          {expressProviders.map((provider) => (
            <label
              key={provider.id}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedProvider === provider.id
                  ? 'border-rose-400 bg-rose-400/10'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={selectedProvider === provider.id}
                onChange={(e) =>
                  setSelectedProvider(e.target.value as 'paypal' | 'google_pay' | 'apple_pay')
                }
                disabled={isProcessing || isSubmitting}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{provider.name}</p>
                <p className="text-slate-400 text-xs">{provider.description}</p>
              </div>
              <img
                src={provider.image}
                alt={provider.name}
                className="h-8 object-contain flex-shrink-0"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Guidance */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-2">Guidance:</p>
            <p>
              Use the Pay button below to pay through your Payment Provider.
            </p>
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
        disabled={!selectedProvider || isProcessing || isSubmitting}
        className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-2xl hover:from-rose-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Processing Payment...' : `Pay ${currency} ${amount.toLocaleString()}`}
      </button>
    </form>
  );
}
