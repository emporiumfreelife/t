import React, { useState } from 'react';
import { Edit2, X, Trash2 } from 'lucide-react';

interface Customer {
  contact_id: string;
  contact_name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onDelete: (customerId: string) => Promise<void>;
  onUpdate?: (customerId: string, data: Partial<Customer>) => Promise<void>;
}

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
  onDelete,
  onUpdate,
}: CustomerDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Customer> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !customer) return null;

  const handleEdit = () => {
    setEditData({
      contact_name: customer.contact_name,
      email: customer.email,
      phone: customer.phone,
      company_name: customer.company_name,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editData || !onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(customer.contact_id, editData);
      setIsEditing(false);
      setEditData(null);
    } catch (error) {
      console.error('Error updating customer:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(customer.contact_id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-white/10 w-full max-w-lg max-h-[600px] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
          <h3 className="text-xl font-bold text-white">{isEditing ? 'Edit Customer' : 'Customer Details'}</h3>
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
                <label className="text-gray-400 text-sm">Name</label>
                <p className="text-white font-medium">{customer.contact_name}</p>
              </div>

              {customer.company_name && (
                <div>
                  <label className="text-gray-400 text-sm">Company</label>
                  <p className="text-white">{customer.company_name}</p>
                </div>
              )}

              {customer.email && (
                <div>
                  <label className="text-gray-400 text-sm">Email</label>
                  <p className="text-white">{customer.email}</p>
                </div>
              )}

              {customer.phone && (
                <div>
                  <label className="text-gray-400 text-sm">Phone</label>
                  <p className="text-white">{customer.phone}</p>
                </div>
              )}
            </>
          ) : editData ? (
            <>
              <div>
                <label className="text-gray-400 text-sm">Name</label>
                <input
                  type="text"
                  value={editData.contact_name || ''}
                  onChange={(e) => setEditData({ ...editData, contact_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Company</label>
                <input
                  type="text"
                  value={editData.company_name || ''}
                  onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Email</label>
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm">Phone</label>
                <input
                  type="tel"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  placeholder="Enter phone"
                />
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
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
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
