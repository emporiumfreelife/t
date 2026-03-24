import React from 'react';
import { Zap } from 'lucide-react';

interface Customer {
  contact_id: string;
  contact_name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

interface InvoiceForm {
  customer_id: string;
  description: string;
  quantity: number;
  rate: number;
  invoice_date: string;
  due_date: string;
  notes: string;
}

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  invoiceForm: InvoiceForm;
  onFormChange: (form: InvoiceForm) => void;
  customers: Customer[];
  isSaving: boolean;
}

export default function NewInvoiceModal({
  isOpen,
  onClose,
  onSubmit,
  invoiceForm,
  onFormChange,
  customers,
  isSaving,
}: NewInvoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-lg max-h-96 overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800">
          <h3 className="text-xl font-bold text-white">Create New Invoice</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {customers.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-300 text-sm mb-4">
              <p className="font-medium mb-2">⚠️ No customers found</p>
              <p>Please create at least one customer before creating an invoice. Go to the Customers tab and click "New Customer".</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Customer *
              </label>
              <select
                value={invoiceForm.customer_id}
                onChange={(e) => onFormChange({ ...invoiceForm, customer_id: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.contact_id} value={customer.contact_id}>
                    {customer.contact_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <input
              type="text"
              value={invoiceForm.description}
              onChange={(e) => onFormChange({ ...invoiceForm, description: e.target.value })}
              placeholder="Item description"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={invoiceForm.quantity}
                onChange={(e) => onFormChange({ ...invoiceForm, quantity: parseFloat(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rate *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={invoiceForm.rate}
                onChange={(e) => onFormChange({ ...invoiceForm, rate: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceForm.invoice_date}
                onChange={(e) => onFormChange({ ...invoiceForm, invoice_date: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={invoiceForm.due_date}
                onChange={(e) => onFormChange({ ...invoiceForm, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={invoiceForm.notes}
              onChange={(e) => onFormChange({ ...invoiceForm, notes: e.target.value })}
              placeholder="Add any notes..."
              rows={2}
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
              disabled={isSaving || customers.length === 0}
              className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isSaving && <Zap className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
