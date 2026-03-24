import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Copy, Info } from 'lucide-react';

interface BankTransferPaymentFormProps {
  amount: number;
  orderId: string;
  onSubmit: (bankData: BankTransferData) => Promise<void>;
  isProcessing: boolean;
}

export interface BankTransferData {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  reference: string;
}

export default function BankTransferPaymentForm({
  amount,
  orderId,
  onSubmit,
  isProcessing,
}: BankTransferPaymentFormProps) {
  const [bankData, setBankData] = useState<BankTransferData>({
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    reference: `COURSE-${orderId.slice(0, 8).toUpperCase()}`,
  });

  const [errors, setErrors] = useState<Partial<BankTransferData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company bank details (would come from env in production)
  const companyBankDetails = {
    accountName: 'Professional Empowerment Association',
    accountNumber: '1234567890',
    bankName: 'Standard Chartered Bank Uganda',
    swiftCode: 'SCBLUGKA',
    branchCode: 'KMP',
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<BankTransferData> = {};

    if (!bankData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!bankData.accountNumber.trim()) {
      newErrors.accountNumber = 'Your account number is required';
    }

    if (!bankData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!bankData.reference.trim()) {
      newErrors.reference = 'Reference is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(bankData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Company Bank Details */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5 space-y-3">
        <h3 className="text-white font-semibold text-sm mb-3">Transfer Details</h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Account Name:</span>
            <button
              type="button"
              onClick={() => handleCopy(companyBankDetails.accountName)}
              className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors"
            >
              <span className="font-mono text-xs">{companyBankDetails.accountName}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Account Number:</span>
            <button
              type="button"
              onClick={() => handleCopy(companyBankDetails.accountNumber)}
              className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors"
            >
              <span className="font-mono text-xs">{companyBankDetails.accountNumber}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Bank Name:</span>
            <button
              type="button"
              onClick={() => handleCopy(companyBankDetails.bankName)}
              className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors"
            >
              <span className="font-mono text-xs">{companyBankDetails.bankName}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Swift Code:</span>
            <button
              type="button"
              onClick={() => handleCopy(companyBankDetails.swiftCode)}
              className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors"
            >
              <span className="font-mono text-xs">{companyBankDetails.swiftCode}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Amount:</span>
              <span className="font-bold text-rose-400">UGX {amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Reference:</span>
            <button
              type="button"
              onClick={() => handleCopy(bankData.reference)}
              className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors"
            >
              <span className="font-mono font-semibold text-xs">{bankData.reference}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Your Bank Details Section */}
      <div>
        <h3 className="text-slate-200 font-semibold text-sm mb-3">Your Information</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Your Name</label>
            <input
              type="text"
              value={bankData.accountHolderName}
              onChange={(e) =>
                setBankData({ ...bankData, accountHolderName: e.target.value })
              }
              disabled={isProcessing || isSubmitting}
              className={`w-full px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
                errors.accountHolderName ? 'border-red-500' : 'border-slate-600/50'
              }`}
              placeholder="Your full name"
            />
            {errors.accountHolderName && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.accountHolderName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Your Account Number</label>
            <input
              type="text"
              value={bankData.accountNumber}
              onChange={(e) =>
                setBankData({ ...bankData, accountNumber: e.target.value })
              }
              disabled={isProcessing || isSubmitting}
              className={`w-full px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
                errors.accountNumber ? 'border-red-500' : 'border-slate-600/50'
              }`}
              placeholder="Your bank account number"
            />
            {errors.accountNumber && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.accountNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Your Bank Name</label>
            <input
              type="text"
              value={bankData.bankName}
              onChange={(e) =>
                setBankData({ ...bankData, bankName: e.target.value })
              }
              disabled={isProcessing || isSubmitting}
              className={`w-full px-4 py-3 bg-slate-700/40 border rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-400 focus:border-rose-400/50 transition-all disabled:opacity-50 ${
                errors.bankName ? 'border-red-500' : 'border-slate-600/50'
              }`}
              placeholder="Name of your bank"
            />
            {errors.bankName && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.bankName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300">
            <p className="font-medium mb-2">Instructions:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Copy the company details above</li>
              <li>Use your bank app to initiate a transfer</li>
              <li>Include the reference number in your transfer</li>
              <li>Your enrollment will be confirmed once payment is received</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-green-300">
          Bank transfers are secure and directly verified by your bank.
        </p>
      </div>

      <button
        type="submit"
        disabled={isProcessing || isSubmitting}
        className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-2xl hover:from-rose-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Verifying Transfer...' : 'Confirm Transfer Details'}
      </button>
    </form>
  );
}
