import React, { useState } from 'react';
import { Plus, FileText, CheckCircle2, AlertCircle, Mail, Clock, Eye, Edit2, Trash2, Zap } from 'lucide-react';
import InvoiceDetailModal from './InvoiceDetailModal';

interface LineItem {
  item_id?: string;
  line_item_id?: string;
  description: string;
  quantity: number;
  rate: number;
}

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_id?: string;
  total: number;
  status: string;
  invoice_date: string;
  due_date: string;
  notes?: string;
  reference_number?: string;
  line_items?: LineItem[];
}

interface InvoicesTabProps {
  invoices: Invoice[];
  isLoading: boolean;
  onNewClick: () => void;
  onView?: (invoiceId: string) => Promise<void>;
  onEdit?: (invoiceId: string) => Promise<void>;
  onDelete?: (invoiceId: string) => Promise<void>;
  onUpdate?: (invoiceId: string, data: Partial<Invoice>) => Promise<void>;
}

export default function InvoicesTab({ invoices, isLoading, onNewClick, onView, onEdit, onDelete, onUpdate }: InvoicesTabProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleViewInvoice = async (invoice: Invoice) => {
    if (onView) {
      await onView(invoice.invoice_id);
    }
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onNewClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors font-semibold"
      >
        <Plus className="w-4 h-4" />
        New Invoice
      </button>

      {isLoading ? (
        <div className="text-center py-12">
          <Zap className="w-8 h-8 text-rose-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white/5 rounded-lg border border-white/10 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No invoices found</p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/10 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-white font-semibold">Invoice #</th>
                <th className="px-6 py-3 text-left text-white font-semibold">Customer</th>
                <th className="px-6 py-3 text-left text-white font-semibold">Amount</th>
                <th className="px-6 py-3 text-left text-white font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-white font-semibold">Due Date</th>
                <th className="px-6 py-3 text-left text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {invoices.map((invoice) => (
                <tr key={invoice.invoice_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 text-white">{invoice.invoice_number}</td>
                  <td className="px-6 py-3 text-gray-300">{invoice.customer_name}</td>
                  <td className="px-6 py-3 text-white font-semibold">${invoice.total}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' :
                      invoice.status === 'overdue' ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {invoice.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                      {invoice.status === 'overdue' && <AlertCircle className="w-3 h-3" />}
                      {invoice.status === 'sent' && <Mail className="w-3 h-3" />}
                      {invoice.status !== 'paid' && invoice.status !== 'overdue' && invoice.status !== 'sent' && <Clock className="w-3 h-3" />}
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-300">{new Date(invoice.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-3 flex gap-2">
                    <button
                      onClick={() => handleViewInvoice(invoice)}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                      title="View invoice"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InvoiceDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onDelete={onDelete || (async () => {})}
        onUpdate={onUpdate}
      />
    </div>
  );
}
