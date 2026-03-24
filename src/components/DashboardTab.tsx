import React from 'react';
import { Receipt, Users, CreditCard, BarChart4 } from 'lucide-react';

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
  invoice_date: string;
  due_date: string;
}

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

interface DashboardTabProps {
  invoices: Invoice[];
  customers: any[];
  expenses: Expense[];
}

export default function DashboardTab({ invoices, customers, expenses }: DashboardTabProps) {
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Invoices</p>
              <p className="text-3xl font-bold text-white">{invoices.length}</p>
            </div>
            <Receipt className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Customers</p>
              <p className="text-3xl font-bold text-white">{customers.length}</p>
            </div>
            <Users className="w-8 h-8 text-emerald-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Expenses</p>
              <p className="text-3xl font-bold text-white">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>
            <CreditCard className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Reports</p>
              <p className="text-3xl font-bold text-white">Ready</p>
            </div>
            <BarChart4 className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Invoices</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.invoice_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-400">{invoice.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${invoice.total}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' :
                    invoice.status === 'overdue' ? 'bg-red-500/20 text-red-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Expenses</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.expense_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">{expense.vendor_name}</p>
                  <p className="text-sm text-gray-400">{new Date(expense.expense_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">${expense.amount}</p>
                  <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                    {expense.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
