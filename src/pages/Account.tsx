import { useState, useEffect } from 'react';
import {
  CreditCard,
  FileText,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  Filter,
  Clock,
  Package,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
}

interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'pending';
  budget: number;
  spent: number;
  startDate: string;
  dueDate: string;
  progress: number;
}

interface PurchaseOrder {
  id: string;
  item: string;
  quantity: number;
  price: number;
  date: string;
  status: 'pending' | 'processing' | 'delivered' | 'completed';
  category: string;
}

export default function Account() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'projects' | 'purchases' | 'documents'>('overview');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: '1', invoice_number: 'INV-2024-001', amount: 25, date: '2024-02-01', status: 'paid', description: 'Media Production Services' },
    { id: '2', invoice_number: 'INV-2024-002', amount: 18, date: '2024-02-15', status: 'paid', description: 'Video Editing Services' },
    { id: '3', invoice_number: 'INV-2024-003', amount: 32, date: '2024-03-01', status: 'pending', description: 'Content Creation Package' },
  ]);
  const [projects, setProjects] = useState<Project[]>([
    { id: '1', name: 'Brand Video Campaign', status: 'active', budget: 50, spent: 32, startDate: '2024-02-01', dueDate: '2024-03-15', progress: 65 },
    { id: '2', name: 'Social Media Content Series', status: 'active', budget: 30, spent: 15, startDate: '2024-02-15', dueDate: '2024-04-01', progress: 50 },
    { id: '3', name: 'Product Photography', status: 'completed', budget: 20, spent: 20, startDate: '2024-01-15', dueDate: '2024-02-01', progress: 100 },
  ]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([
    { id: '1', item: 'Premium Music Licensing Pack', quantity: 1, price: 29, date: '2024-03-05', status: 'delivered', category: 'Resources' },
    { id: '2', item: 'Stock Video Footage Bundle', quantity: 1, price: 19, date: '2024-03-01', status: 'completed', category: 'Resources' },
    { id: '3', item: 'Adobe Creative Cloud - 3 Months', quantity: 3, price: 5.49, date: '2024-02-20', status: 'active', category: 'Subscriptions' },
    { id: '4', item: 'Lighting Equipment Rental', quantity: 2, price: 15, date: '2024-02-10', status: 'completed', category: 'Equipment' },
  ]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, type, message };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const totalPending = invoices.filter((inv) => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);
  const totalProjectsBudget = projects.reduce((sum, proj) => sum + proj.budget, 0);
  const totalProjectsSpent = projects.reduce((sum, proj) => sum + proj.spent, 0);
  const totalPurchases = purchases.reduce((sum, pur) => sum + (pur.price * pur.quantity), 0);

  if (!user) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto text-center py-20">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Please sign in to access your account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-playfair font-bold text-white mb-2">Account Management</h1>
          <p className="text-gray-300">Manage billing, projects, purchases, and account records</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-white/10 overflow-x-auto">
          {(['overview', 'billing', 'projects', 'purchases', 'documents'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold transition-all capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'text-rose-400 border-b-2 border-rose-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'billing' && 'Billing & Payments'}
              {tab === 'projects' && 'Projects'}
              {tab === 'purchases' && 'Purchases'}
              {tab === 'documents' && 'Documents'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-effect rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400 text-sm font-medium">Total Invoiced</p>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">${totalInvoiced.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-2">{invoices.length} invoices</p>
              </div>

              <div className="glass-effect rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400 text-sm font-medium">Amount Paid</p>
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">${totalPaid.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-2">Completed payments</p>
              </div>

              <div className="glass-effect rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400 text-sm font-medium">Projects Budget</p>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">${totalProjectsBudget.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-2">{projects.length} active/completed</p>
              </div>

              <div className="glass-effect rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400 text-sm font-medium">Total Purchases</p>
                  <ShoppingBag className="w-5 h-5 text-rose-400" />
                </div>
                <p className="text-3xl font-bold text-white">${totalPurchases.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-2">{purchases.length} orders</p>
              </div>
            </div>

            {/* Account Status */}
            <div className="glass-effect rounded-2xl border border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Account Status</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Payment Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <span className="text-white font-semibold">Good Standing</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">No overdue invoices</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Membership Tier</p>
                  <p className="text-white font-semibold capitalize">{user.tier}</p>
                  <p className="text-xs text-gray-400 mt-2">Active subscription</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Account Age</p>
                  <p className="text-white font-semibold">
                    {user.joined_date
                      ? new Date(user.joined_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : 'Recently'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Member since</p>
                </div>
              </div>
            </div>

            {/* Pending Items */}
            {totalPending > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-1">Pending Payment</h3>
                    <p className="text-yellow-200 text-sm">You have ${totalPending.toLocaleString()} in pending invoices.</p>
                    <button
                      onClick={() => setActiveTab('billing')}
                      className="mt-3 text-yellow-300 text-sm font-semibold hover:text-yellow-200 transition-colors flex items-center gap-1"
                    >
                      View Invoices <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Billing & Payments Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="glass-effect rounded-2xl border border-white/10 p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Invoices & Payments</h2>
                <button className="py-2 px-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>

              {/* Filter */}
              <div className="mb-6">
                <div className="flex gap-2 flex-wrap">
                  {['all', 'paid', 'pending', 'overdue'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        filterStatus === status
                          ? 'bg-rose-500 text-white'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invoices Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Invoice</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Date</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Description</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Amount</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white font-semibold">{invoice.invoice_number}</td>
                        <td className="py-3 px-4 text-gray-300">{new Date(invoice.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-gray-300">{invoice.description}</td>
                        <td className="py-3 px-4 text-white font-semibold text-right">${invoice.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              invoice.status === 'paid'
                                ? 'bg-green-500/20 text-green-300'
                                : invoice.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-rose-400 hover:text-rose-300 transition-colors text-sm font-semibold flex items-center gap-1 ml-auto">
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="glass-effect rounded-2xl border border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Payment Methods</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="text-white font-semibold">Visa ending in 4242</p>
                      <p className="text-xs text-gray-400">Expires 12/2025</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white text-sm font-semibold">Edit</button>
                </div>
              </div>

              <button className="mt-4 py-2 px-4 bg-white/5 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-sm">
                + Add Payment Method
              </button>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {projects.map((project) => (
              <div key={project.id} className="glass-effect rounded-2xl border border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{project.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.startDate).toLocaleDateString()} - {new Date(project.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      project.status === 'active'
                        ? 'bg-blue-500/20 text-blue-300'
                        : project.status === 'completed'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}
                  >
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">Progress</p>
                    <p className="text-sm font-semibold text-white">{project.progress}%</p>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Budget Info */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-gray-400 text-xs mb-1">Budget</p>
                    <p className="text-white font-bold">${project.budget.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-gray-400 text-xs mb-1">Spent</p>
                    <p className="text-white font-bold">${project.spent.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <p className="text-gray-400 text-xs mb-1">Remaining</p>
                    <p className="text-white font-bold">${(project.budget - project.spent).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}

            <button className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
              + New Project
            </button>
          </div>
        )}

        {/* Purchases Tab */}
        {activeTab === 'purchases' && (
          <div className="space-y-6">
            <div className="glass-effect rounded-2xl border border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Purchase Orders & Resources</h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Item</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Category</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">Qty</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Price</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Date</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white font-semibold">{purchase.item}</td>
                        <td className="py-3 px-4 text-gray-300 text-sm">{purchase.category}</td>
                        <td className="py-3 px-4 text-gray-300 text-center">{purchase.quantity}</td>
                        <td className="py-3 px-4 text-white font-semibold text-right">${(purchase.price * purchase.quantity).toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-300 text-sm">{new Date(purchase.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              purchase.status === 'delivered' || purchase.status === 'completed'
                                ? 'bg-green-500/20 text-green-300'
                                : purchase.status === 'processing'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button className="w-full py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all">
              + New Purchase Order
            </button>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-effect rounded-2xl border border-white/10 p-6 hover:border-rose-400/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Invoices</h3>
                <p className="text-gray-400 text-sm mb-4">{invoices.length} documents</p>
                <button className="text-rose-400 text-sm font-semibold hover:text-rose-300">View All →</button>
              </div>

              <div className="glass-effect rounded-2xl border border-white/10 p-6 hover:border-rose-400/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <Package className="w-8 h-8 text-green-400" />
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Receipts</h3>
                <p className="text-gray-400 text-sm mb-4">{purchases.length} documents</p>
                <button className="text-rose-400 text-sm font-semibold hover:text-rose-300">View All →</button>
              </div>

              <div className="glass-effect rounded-2xl border border-white/10 p-6 hover:border-rose-400/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-purple-400" />
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Contracts</h3>
                <p className="text-gray-400 text-sm mb-4">3 documents</p>
                <button className="text-rose-400 text-sm font-semibold hover:text-rose-300">View All →</button>
              </div>
            </div>

            {/* Recent Documents */}
            <div className="glass-effect rounded-2xl border border-white/10 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Recent Documents</h2>

              <div className="space-y-3">
                {invoices.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white font-semibold text-sm">{invoice.invoice_number}</p>
                        <p className="text-gray-400 text-xs">{invoice.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-white font-semibold text-sm">${invoice.amount.toLocaleString()}</p>
                      <button className="text-rose-400 hover:text-rose-300 transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 space-y-3 z-40">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-6 py-4 rounded-lg backdrop-blur-md border shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500/20 border-green-400/50 text-green-100'
                : 'bg-red-500/20 border-red-400/50 text-red-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
