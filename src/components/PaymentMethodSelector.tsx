import React from 'react';
import { PaymentMethodType, PAYMENT_METHODS } from '../lib/paymentMethodConfig';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onMethodChange: (method: PaymentMethodType) => void;
  currency?: string;
}

const methodImages = {
  card: 'https://f003.backblazeb2.com/file/houzing/admin1images/a+(2).png',
  mobile_money: {
    main: 'https://f003.backblazeb2.com/file/houzing/admin1images/a+(4).png',
    mpesa: 'https://f003.backblazeb2.com/file/houzing/admin1images/a+(1).png',
  },
  express_pay: {
    paypal: 'https://f003.backblazeb2.com/file/houzing/admin1images/c.png',
    googlePay: 'https://f003.backblazeb2.com/file/houzing/admin1images/b+(3).png',
    applePay: 'https://f003.backblazeb2.com/file/houzing/admin1images/d.png',
  },
};

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  currency = 'UGX',
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm font-semibold">Select how you'd like to pay:</p>

      <div className="space-y-3">
        {Object.entries(PAYMENT_METHODS).map(([methodId, method]) => {
          const isSelected = selectedMethod === methodId;
          const isCardMethod = methodId === 'card';
          const isMobileMoneyMethod = methodId === 'mobile_money';
          const isExpressPayMethod = methodId === 'express_pay';

          return (
            <label
              key={methodId}
              className={`relative flex items-start sm:items-center gap-4 p-5 sm:p-6 rounded-xl border-2 transition-all cursor-pointer w-full ${
                isSelected
                  ? 'border-rose-400 bg-rose-400/15 shadow-lg shadow-rose-400/20'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              {/* Selection Indicator (replaces radio button) */}
              <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-rose-400 border-rose-400'
                  : 'border-slate-500 bg-transparent'
              }`}>
                {isSelected && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Content Container */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                <h3 className="text-white font-semibold text-center sm:text-left">{method.name}</h3>

                {/* Images Container - Single grey box for all images */}
                <div className="bg-slate-300 p-4 rounded-lg flex items-center justify-center gap-3 h-16 sm:h-20 flex-1 -ml-10 sm:ml-0 sm:w-auto sm:px-4">
                  {isCardMethod && (
                    <img
                      src={methodImages.card}
                      alt="Visa, Mastercard and other cards"
                      className="h-12 sm:h-16 w-auto object-contain"
                    />
                  )}

                  {isMobileMoneyMethod && (
                    <>
                      <img
                        src={methodImages.mobile_money.mpesa}
                        alt="M-Pesa"
                        className="h-12 sm:h-16 w-auto object-contain"
                      />
                      <img
                        src={methodImages.mobile_money.main}
                        alt="Mobile money providers"
                        className="h-12 sm:h-16 w-auto object-contain"
                      />
                    </>
                  )}

                  {isExpressPayMethod && (
                    <>
                      <img
                        src={methodImages.express_pay.paypal}
                        alt="PayPal"
                        className="h-10 sm:h-12 w-auto object-contain"
                      />
                      <img
                        src={methodImages.express_pay.googlePay}
                        alt="Google Pay"
                        className="h-10 sm:h-14 w-auto object-contain"
                      />
                      <img
                        src={methodImages.express_pay.applePay}
                        alt="Apple Pay"
                        className="h-10 sm:h-14 w-auto object-contain"
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Hidden radio input for form integration */}
              <input
                type="radio"
                name="paymentMethod"
                value={methodId}
                checked={isSelected}
                onChange={() => onMethodChange(methodId as PaymentMethodType)}
                className="hidden"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
