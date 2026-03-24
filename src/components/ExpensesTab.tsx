import React from 'react';
import { Plus, TrendingUp, Eye, Edit2, Trash2, Zap } from 'lucide-react';

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

interface ExpensesTabProps {
  expenses: Expense[];
  isLoading: boolean;
  currency: string;
  onNewClick: () => void;
  onView: (expenseId: string) => Promise<void>;
  onEdit?: (expenseId: string) => Promise<void>;
  onDelete: (expenseId: string) => Promise<void>;
}

export default function ExpensesTab({
  expenses,
  isLoading,
  currency,
  onNewClick,
  onView,
  onEdit,
  onDelete,
}: ExpensesTabProps) {
  return (
    <div className="space-y-6">
      <button
        onClick={onNewClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-semibold"
      >
        <Plus className="w-4 h-4" />
        New Expense
      </button>

      {isLoading ? (
        <div className="text-center py-12">
          <Zap className="w-8 h-8 text-rose-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white/5 rounded-lg border border-white/10 p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No expenses found</p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/10 border-b border-white/10">
              <tr>
                <th className="px-3 py-3 text-left text-white font-semibold">Vendor</th>
                <th className="px-3 py-3 text-left text-white font-semibold">Customer</th>
                <th className="px-3 py-3 text-left text-white font-semibold">Amount</th>
                <th className="px-3 py-3 text-left text-white font-semibold">Ref #</th>
                <th className="px-3 py-3 text-left text-white font-semibold">Account</th>
                <th className="px-3 py-3 text-left text-white font-semibold">Status</th>
                <th className="px-3 py-3 text-left text-white font-semibold">Date</th>
                <th className="px-3 py-3 text-left text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {expenses.map((expense) => (
                <tr key={expense.expense_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 py-3 text-white">{expense.vendor_name}</td>
                  <td className="px-3 py-3 text-gray-300">{expense.customer_name || '-'}</td>
                  <td className="px-3 py-3 text-white font-semibold">
                    {currency} {expense.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{expense.reference_number || '-'}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{expense.account_name || '-'}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-300">{new Date(expense.expense_date).toLocaleDateString()}</td>
                  <td className="px-3 py-3 flex gap-1">
                    <button
                      onClick={() => onView(expense.expense_id)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(expense.expense_id)}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(expense.expense_id)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
