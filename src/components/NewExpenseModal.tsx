import React from 'react';
import { Zap } from 'lucide-react';

interface Vendor {
  contact_id: string;
  contact_name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

interface ExpenseAccount {
  account_id: string;
  account_name: string;
  account_type: string;
}

interface ExpenseForm {
  vendor_id: string;
  account_id: string;
  reference_number: string;
  amount: number;
  expense_date: string;
  notes: string;
}

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: (resetForm?: boolean) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  expenseForm: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  vendors: Vendor[];
  expenseAccounts: ExpenseAccount[];
  isSaving: boolean;
  isLoading: boolean;
}

export default function NewExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  expenseForm,
  onFormChange,
  vendors,
  expenseAccounts,
  isSaving,
  isLoading,
}: NewExpenseModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-lg max-h-96 overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800">
          <h3 className="text-xl font-bold text-white">Create New Expense</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* Load expense accounts on modal open */}
          {expenseAccounts.length === 0 && (
            <div className="text-center py-2 text-sm text-gray-400">
              {isLoading ? 'Loading expense accounts...' : 'No expense accounts found'}
            </div>
          )}

          {vendors.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-300 text-sm mb-4">
              <p className="font-medium mb-2">⚠️ No vendors found</p>
              <p>Please create at least one vendor before creating an expense. Go to the Vendors tab and click "New Vendor".</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vendor *
              </label>
              <select
                value={expenseForm.vendor_id}
                onChange={(e) => onFormChange({ ...expenseForm, vendor_id: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-colors"
              >
                <option value="">Select a vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.contact_id} value={vendor.contact_id}>
                    {vendor.contact_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expense Account *
            </label>
            <select
              value={expenseForm.account_id}
              onChange={(e) => onFormChange({ ...expenseForm, account_id: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-colors"
            >
              <option value="">Select an expense account</option>
              {expenseAccounts.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={expenseForm.reference_number}
              onChange={(e) => onFormChange({ ...expenseForm, reference_number: e.target.value })}
              placeholder="Leave empty for auto-generated reference"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseForm.amount}
              onChange={(e) => onFormChange({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expense Date *
            </label>
            <input
              type="date"
              value={expenseForm.expense_date}
              onChange={(e) => onFormChange({ ...expenseForm, expense_date: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={expenseForm.notes}
              onChange={(e) => onFormChange({ ...expenseForm, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={2}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || vendors.length === 0 || expenseAccounts.length === 0}
              className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isSaving && <Zap className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Creating...' : 'Create Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
