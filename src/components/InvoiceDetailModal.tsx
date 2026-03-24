import React, { useState, useMemo } from 'react';
import { Edit2, X, Plus, Trash2 } from 'lucide-react';

interface LineItem {
  item_id?: string;
  description: string;
  quantity: number;
  rate: number;
  line_item_id?: string;
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

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onDelete: (invoiceId: string) => Promise<void>;
  onUpdate?: (invoiceId: string, data: Partial<Invoice>) => Promise<void>;
}

export default function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  onDelete,
  onUpdate,
}: InvoiceDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Invoice> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const calculatedTotal = useMemo(() => {
    if (!editData?.line_items || !invoice) return invoice?.total || 0;
    return editData.line_items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  }, [editData?.line_items, invoice]);

  const handleEdit = () => {
    if (!invoice) return;
    setEditData({
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      notes: invoice.notes,
      reference_number: invoice.reference_number,
      line_items: invoice.line_items || [],
    });
    setIsEditing(true);
  };

  const handleAddLineItem = () => {
    if (!editData) return;
    const newItem: LineItem = {
      description: '',
      quantity: 1,
      rate: 0,
    };
    setEditData({
      ...editData,
      line_items: [...(editData.line_items || []), newItem],
    });
  };

  const handleUpdateLineItem = (index: number, field: string, value: any) => {
    if (!editData?.line_items) return;
    const updatedItems = [...editData.line_items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'quantity' || field === 'rate' ? parseFloat(value) || 0 : value,
    };
    setEditData({
      ...editData,
      line_items: updatedItems,
    });
  };

  const handleRemoveLineItem = (index: number) => {
    if (!editData?.line_items) return;
    setEditData({
      ...editData,
      line_items: editData.line_items.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!editData || !onUpdate || !invoice) return;
    setIsSaving(true);
    try {
      await onUpdate(invoice.invoice_id, editData);
      setIsEditing(false);
      setEditData(null);
    } catch (error) {
      console.error('Error updating invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    await onDelete(invoice.invoice_id);
    onClose();
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-lg max-h-[600px] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Invoice' : 'Invoice Details'}</h3>
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
                <label className="text-gray-400 text-sm">Invoice #</label>
                <p className="text-white font-medium">{invoice.invoice_number}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Customer</label>
                <p className="text-white font-medium">{invoice.customer_name}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Amount</label>
                <p className="text-white font-medium text-lg">
                  ${invoice.total.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Invoice Date</label>
                <p className="text-white">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Due Date</label>
                <p className="text-white">{new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Status</label>
                <p className="text-white capitalize">{invoice.status}</p>
              </div>

              {invoice.line_items && invoice.line_items.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <label className="text-gray-400 text-sm block mb-3">Line Items</label>
                  <div className="space-y-2">
                    {invoice.line_items.map((item, idx) => (
                      <div key={idx} className="bg-white/5 p-3 rounded border border-white/10">
                        <p className="text-white text-sm font-medium">{item.description}</p>
                        <p className="text-gray-400 text-xs mt-1">
                          {item.quantity} × ${item.rate.toFixed(2)} = ${(item.quantity * item.rate).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <label className="text-gray-400 text-sm">Notes</label>
                  <p className="text-white">{invoice.notes}</p>
                </div>
              )}
            </>
          ) : editData ? (
            <>
              <div>
                <label className="text-gray-400 text-sm">Invoice #</label>
                <p className="text-white font-medium">{invoice.invoice_number}</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Customer</label>
                <p className="text-white font-medium">{invoice.customer_name}</p>
              </div>

              <div className="border-t border-white/10 pt-4 border-b pb-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-gray-400 text-sm">Line Items</label>
                  <button
                    onClick={handleAddLineItem}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>

                {editData?.line_items && editData.line_items.length > 0 ? (
                  <div className="space-y-3">
                    {editData.line_items.map((item, idx) => (
                      <div key={idx} className="bg-white/5 p-3 rounded border border-white/10 space-y-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-rose-500"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-gray-400 text-xs block mb-1">Qty</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs block mb-1">Rate</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => handleUpdateLineItem(idx, 'rate', e.target.value)}
                              className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-rose-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="flex-1 mr-2">
                              <label className="text-gray-400 text-xs block mb-1">Total</label>
                              <p className="text-white text-sm font-medium">${(item.quantity * item.rate).toFixed(2)}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveLineItem(idx)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No line items. Add one to proceed.</p>
                )}
              </div>

              <div>
                <label className="text-gray-400 text-sm">Total Amount</label>
                <p className="text-white font-medium text-lg">
                  ${calculatedTotal.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Invoice Date</label>
                <input
                  type="date"
                  value={editData.invoice_date || ''}
                  onChange={(e) => setEditData({ ...editData, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Due Date</label>
                <input
                  type="date"
                  value={editData.due_date || ''}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Reference Number</label>
                <input
                  type="text"
                  value={editData.reference_number || ''}
                  onChange={(e) => setEditData({ ...editData, reference_number: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter reference number"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Notes</label>
                <textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter notes"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Status</label>
                <p className="text-white capitalize">{invoice.status}</p>
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
