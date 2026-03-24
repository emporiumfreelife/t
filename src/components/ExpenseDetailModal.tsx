import React, { useState } from 'react';
import { Edit2, X } from 'lucide-react';

interface Expense {
  expense_id: string;
  vendor_name: string;
  vendor_id?: string;
  amount: number;
  status: string;
  expense_date: string;
  reference_number?: string;
  customer_name?: string;
  paid_through?: string;
  account_name?: string;
  account_id?: string;
  currency?: string;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  currencyDefault: string;
  onDelete: (expenseId: string) => Promise<void>;
  onUpdate?: (expenseId: string, data: Partial<Expense>) => Promise<void>;
}

export default function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  currencyDefault,
  onDelete,
  onUpdate,
}: ExpenseDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Expense> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !expense) return null;

  const handleEdit = () => {
    setEditData({
      amount: expense.amount,
      reference_number: expense.reference_number,
      customer_name: expense.customer_name,
      notes: undefined,
      expense_date: expense.expense_date,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData || !onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(expense.expense_id, editData);
      setIsEditing(false);
      setEditData(null);
    } catch (error) {
      console.error('Error updating expense:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(expense.expense_id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-lg max-h-[600px] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Expense' : 'Expense Details'}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!isEditing ? (
            <>
              <div>
                <label className="text-gray-400 text-sm">Vendor</label>
                <p className="text-white font-medium">{expense.vendor_name}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Amount</label>
                <p className="text-white font-medium text-lg">
                  {expense.currency || currencyDefault} {expense.amount.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Reference #</label>
                <p className="text-white">{expense.reference_number || 'N/A'}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Account</label>
                <p className="text-white">{expense.account_name || 'N/A'}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Expense Date</label>
                <p className="text-white">{new Date(expense.expense_date).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Status</label>
                <p className="text-white capitalize">{expense.status}</p>
              </div>

              {expense.customer_name && (
                <div>
                  <label className="text-gray-400 text-sm">Customer</label>
                  <p className="text-white">{expense.customer_name}</p>
                </div>
              )}

              {expense.paid_through && (
                <div>
                  <label className="text-gray-400 text-sm">Paid Through</label>
                  <p className="text-white">{expense.paid_through}</p>
                </div>
              )}
            </>
          ) : editData ? (
            <>
              <div>
                <label className="text-gray-400 text-sm">Vendor</label>
                <p className="text-white font-medium">{expense.vendor_name}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Amount</label>
                <input
                  type="number"
                  value={editData.amount || 0}
                  onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Reference #</label>
                <input
                  type="text"
                  value={editData.reference_number || ''}
                  onChange={(e) => setEditData({ ...editData, reference_number: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter reference number"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Expense Date</label>
                <input
                  type="date"
                  value={editData.expense_date?.split('T')[0] || ''}
                  onChange={(e) => setEditData({ ...editData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Customer Name</label>
                <input
                  type="text"
                  value={editData.customer_name || ''}
                  onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Account</label>
                <p className="text-white">{expense.account_name || 'N/A'}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Status</label>
                <p className="text-white capitalize">{expense.status}</p>
              </div>
            </>
          ) : null}

          <div className="flex gap-3 pt-4 border-t border-white/10">
            {!isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-medium"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors font-medium disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(null);
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors font-medium"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
