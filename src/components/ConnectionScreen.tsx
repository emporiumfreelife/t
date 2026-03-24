import React from 'react';
import { FileText, Users, TrendingUp, BarChart3, Zap } from 'lucide-react';

interface ConnectionScreenProps {
  onConnect: (url: string) => void;
  connectUrl: string;
}

export default function ConnectionScreen({ onConnect, connectUrl }: ConnectionScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 pt-20 px-4">
      <div className="max-w-2xl mx-auto mt-20">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-white/10 p-12 text-center">
          <FileText className="w-16 h-16 text-rose-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Connect Zoho Books</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Integrate your Zoho Books account to manage invoices, customers, expenses, and financial reports directly from your dashboard.
          </p>

          <div className="bg-white/5 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-semibold text-white mb-4">Features included:</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                Invoice creation and management
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-400" />
                Customer database management
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-400" />
                Vendor and expense tracking
              </li>
              <li className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-400" />
                Financial reports and analytics
              </li>
            </ul>
          </div>

          <a
            href={connectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-rose-500/50 transition-all duration-300"
          >
            <Zap className="w-5 h-5" />
            Connect with Zoho Books
          </a>

          <p className="text-gray-400 text-sm mt-6">
            Secure OAuth connection. Your credentials are encrypted and never stored in plain text.
          </p>
        </div>
      </div>
    </div>
  );
}
