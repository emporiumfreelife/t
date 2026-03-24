import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface CardPaymentFormProps {
  amount: number;
  onSubmit: (cardData: CardData) => Promise<void>;
  isProcessing: boolean;
  currency?: string;
}

export interface CardData {
  cardNumber: string;
  cardHolderName: string;
  expiryDate: string;
  cvv: string;
}

export default function CardPaymentForm({
  amount,
  onSubmit,
  isProcessing,
  currency = 'UGX',
}: CardPaymentFormProps) {
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardHolderName: '',
    expiryDate: '',
    cvv: '',
  });

  const [errors, setErrors] = useState<Partial<CardData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateCard = (): boolean => {
    const newErrors: Partial<CardData> = {};

    // Validate card number (16 digits)
    if (!cardData.cardNumber.replace(/\s/g, '').match(/^\d{16}$/)) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    }

    // Validate cardholder name
    if (!cardData.cardHolderName.trim()) {
      newErrors.cardHolderName = 'Cardholder name is required';
    }

    // Validate expiry date (MM/YY format)
    if (!cardData.expiryDate.match(/^\d{2}\/\d{2}$/)) {
      newErrors.expiryDate = 'Format: MM/YY';
    } else {
      const [month, year] = cardData.expiryDate.split('/').map(Number);
      if (month < 1 || month > 12) {
        newErrors.expiryDate = 'Invalid month';
      }
      const currentYear = new Date().getFullYear() % 100;
      if (year < currentYear) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    // Validate CVV (3 or 4 digits)
    if (!cardData.cvv.match(/^\d{3,4}$/)) {
      newErrors.cvv = 'CVV must be 3 or 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16) {
      value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
      setCardData({ ...cardData, cardNumber: value });
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setCardData({ ...cardData, expiryDate: value });
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCardData({ ...cardData, cvv: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCard()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(cardData);
    } catch (error) {
      console.error('Card payment error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">Card Number</label>
        <input
          type="text"
          placeholder="1234 5678 9012 3456"
          value={cardData.cardNumber}
          onChange={handleCardNumberChange}
          disabled={isProcessing || isSubmitting}
          className={`w-full px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
            errors.cardNumber ? 'border-red-500' : 'border-slate-600/50'
          }`}
        />
        {errors.cardNumber && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.cardNumber}
          </p>
        )}
      </div>

      {/* Cardholder Name */}
      <div>
        <label className="block text-sm font-semibold text-slate-200 mb-2">Cardholder Name</label>
        <input
          type="text"
          placeholder="John Doe"
          value={cardData.cardHolderName}
          onChange={(e) => setCardData({ ...cardData, cardHolderName: e.target.value })}
          disabled={isProcessing || isSubmitting}
          className={`w-full px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
            errors.cardHolderName ? 'border-red-500' : 'border-slate-600/50'
          }`}
        />
        {errors.cardHolderName && (
          <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {errors.cardHolderName}
          </p>
        )}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Expiry Date</label>
          <input
            type="text"
            placeholder="MM/YY"
            value={cardData.expiryDate}
            onChange={handleExpiryChange}
            disabled={isProcessing || isSubmitting}
            className={`w-full px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
              errors.expiryDate ? 'border-red-500' : 'border-slate-600/50'
            }`}
          />
          {errors.expiryDate && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.expiryDate}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">CVV</label>
          <input
            type="text"
            placeholder="123"
            maxLength={4}
            value={cardData.cvv}
            onChange={handleCVVChange}
            disabled={isProcessing || isSubmitting}
            className={`w-full px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
              errors.cvv ? 'border-red-500' : 'border-slate-600/50'
            }`}
          />
          {errors.cvv && (
            <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.cvv}
            </p>
          )}
        </div>
      </div>

      {/* Security Note */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          Your payment is secured with industry-standard encryption. We never store your card details.
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
