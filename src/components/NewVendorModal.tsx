import React from 'react';
import { Zap } from 'lucide-react';

interface VendorForm {
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
}

interface NewVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  vendorForm: VendorForm;
  onFormChange: (form: VendorForm) => void;
  isSaving: boolean;
}

export default function NewVendorModal({
  isOpen,
  onClose,
  onSubmit,
  vendorForm,
  onFormChange,
  isSaving,
}: NewVendorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-lg">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Create New Vendor</h3>
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
              Vendor Name *
            </label>
            <input
              type="text"
              value={vendorForm.contact_name}
              onChange={(e) => onFormChange({ ...vendorForm, contact_name: e.target.value })}
              placeholder="Vendor name"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={vendorForm.company_name}
              onChange={(e) => onFormChange({ ...vendorForm, company_name: e.target.value })}
              placeholder="Vendor company"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={vendorForm.email}
              onChange={(e) => onFormChange({ ...vendorForm, email: e.target.value })}
              placeholder="vendor@example.com"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={vendorForm.phone}
              onChange={(e) => onFormChange({ ...vendorForm, phone: e.target.value })}
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
              {isSaving ? 'Creating...' : 'Create Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
