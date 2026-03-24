import React from 'react';
import { Zap } from 'lucide-react';

interface CustomerForm {
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
}

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  customerForm: CustomerForm;
  onFormChange: (form: CustomerForm) => void;
  isSaving: boolean;
}

export default function NewCustomerModal({
  isOpen,
  onClose,
  onSubmit,
  customerForm,
  onFormChange,
  isSaving,
}: NewCustomerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-lg">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Create New Customer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerForm.contact_name}
              onChange={(e) => onFormChange({ ...customerForm, contact_name: e.target.value })}
              placeholder="John Doe"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={customerForm.company_name}
              onChange={(e) => onFormChange({ ...customerForm, company_name: e.target.value })}
              placeholder="Your Company Inc."
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={customerForm.email}
              onChange={(e) => onFormChange({ ...customerForm, email: e.target.value })}
              placeholder="john@example.com"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={customerForm.phone}
              onChange={(e) => onFormChange({ ...customerForm, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isSaving && <Zap className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
