import React from 'react';
import { Zap } from 'lucide-react';

interface Reports {
  total_income?: number;
  total_expenses?: number;
  net_profit?: number;
  total_assets?: number;
  total_liabilities?: number;
  [key: string]: any;
}

interface ReportsTabProps {
  reports: Reports | null;
  isLoading: boolean;
}

export default function ReportsTab({ reports, isLoading }: ReportsTabProps) {
  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-center py-12">
          <Zap className="w-8 h-8 text-rose-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading reports...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-300 text-sm">
            <p className="font-medium">📊 Financial Reports</p>
            <p className="mt-1">Reports are generated from your Zoho Books data. Ensure you have transactions recorded for accurate reports.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Profit & Loss</h3>
              {reports && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Total Income</span>
                    <span className="text-white font-semibold">
                      ${typeof reports.total_income === 'number' ? reports.total_income.toFixed(2) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Total Expenses</span>
                    <span className="text-white font-semibold">
                      ${typeof reports.total_expenses === 'number' ? reports.total_expenses.toFixed(2) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                    <span className="text-emerald-300 font-semibold">Net Profit</span>
                    <span className="text-emerald-300 font-bold text-lg">
                      ${typeof reports.net_profit === 'number' ? reports.net_profit.toFixed(2) : 0}
                    </span>
                  </div>
                </div>
              )}
              {!reports && (
                <div className="text-center py-8 text-gray-400">
                  <p>No report data available</p>
                </div>
              )}
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-xl font-bold text-white mb-6">Balance Sheet</h3>
              {reports && (reports.total_assets !== undefined || reports.total_liabilities !== undefined) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Total Assets</span>
                    <span className="text-white font-semibold">
                      ${typeof reports.total_assets === 'number' ? reports.total_assets.toFixed(2) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400">Total Liabilities</span>
                    <span className="text-white font-semibold">
                      ${typeof reports.total_liabilities === 'number' ? reports.total_liabilities.toFixed(2) : 0}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>Balance sheet data not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
