import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadToB2 } from '../lib/b2Upload';
import { useAuth } from '../context/AuthContext';
import VideoUploadEvidence from '../components/VideoUploadEvidence';
import {
  ArrowLeft, Upload, Save, X, Plus, Trash2, Check, Clock, AlertCircle,
  Calendar, DollarSign, Users, FileText, Package, CheckSquare, Eye, Share2
} from 'lucide-react';

interface TaskDetails {
  id: string;
  milestone_id: string;
  contract_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'evidence_submitted' | 'verified' | 'invoiced';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  budget_amount: number | null;
  deliverables: string | null;
  sop_protocol: string | null;
  checklist_items: ChecklistItem[];
  vendor_items: VendorItem[];
  assigned_contacts: AssignedContact[];
  declaration_accepted: boolean;
  declaration_text: string;
  assigned_to_email: string | null;
  created_at: string;
  updated_at: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  is_completed: boolean;
  completed_at: string | null;
  deadline: string | null;
}

interface VendorItem {
  id: string;
  name: string;
  unit_cost: number;
  quantity: number;
  total: number;
  vendor_name: string;
  vendor_contact: string | null;
}

interface AssignedContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

interface TaskEvidence {
  id: string;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'video' | 'document';
  evidence_title: string;
  evidence_description: string | null;
  uploaded_at: string;
  uploaded_by_email: string | null;
  shared_field_verification_id: string | null;
  thumbnail_url: string | null;
}

export default function TaskDetailsPage() {
  const { user } = useAuth();
  const { projectId, milestoneId, taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskDetails | null>(null);
  const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<TaskDetails>>({});
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newVendorItem, setNewVendorItem] = useState<Partial<VendorItem>>({});
  const [newContact, setNewContact] = useState<Partial<AssignedContact>>({});

  // Evidence upload
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceCategory, setEvidenceCategory] = useState('process');
  const [evidencePreview, setEvidencePreview] = useState<string>('');
  const [isVideoUpload, setIsVideoUpload] = useState(false);

  // Declaration
  const [showDeclaration, setShowDeclaration] = useState(false);
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false);

  // Fetch task details
  useEffect(() => {
    if (taskId && milestoneId) {
      fetchTaskDetails();
      fetchTaskEvidence();
    }
  }, [taskId, milestoneId]);

  const fetchTaskDetails = async () => {
    try {
      setTask(null);
      setLoading(true);

      if (!taskId || !milestoneId) {
        setError('Task ID and Milestone ID are required');
        setLoading(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('milestone_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('milestone_id', milestoneId)
        .single();

      if (err) throw err;

      setTask(data as TaskDetails);
      setFormData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching task:', err);
      setError('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskEvidence = async () => {
    try {
      const { data, error: err } = await supabase
        .from('task_evidence')
        .select('*')
        .eq('milestone_task_id', taskId)
        .order('uploaded_at', { ascending: false });

      if (err) throw err;
      setEvidence(data as TaskEvidence[]);
    } catch (err) {
      console.error('Error fetching evidence:', err);
    }
  };

  const handleSaveTask = async () => {
    if (!taskId) return;

    try {
      setSaving(true);

      // Build update payload
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date,
        budget_amount: formData.budget_amount,
        deliverables: formData.deliverables,
        sop_protocol: formData.sop_protocol,
        checklist_items: formData.checklist_items,
        vendor_items: formData.vendor_items,
        assigned_contacts: formData.assigned_contacts,
        updated_at: new Date().toISOString(),
      };

      const { error: err } = await supabase
        .from('milestone_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (err) throw err;

      setTask(prev => prev ? { ...prev, ...updateData } : null);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleEvidenceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEvidenceFile(file);
      setIsVideoUpload(file.type.startsWith('video/'));
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (evt) => setEvidencePreview(evt.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setEvidencePreview('');
      }
    }
  };

  const handleUploadEvidence = async () => {
    // For videos, VideoUploadEvidence component handles upload
    if (isVideoUpload) return;

    if (!evidenceFile || !evidenceTitle || !task) return;

    try {
      setUploadingEvidence(true);

      // Determine file type
      const fileType = evidenceFile.type.startsWith('image/')
        ? 'image'
        : 'document';

      // Upload to B2 with path: task-evidence/{milestone_id}/{task_id}/{timestamp}
      const uploadPath = `task-evidence/${task.milestone_id}/${task.id}/${Date.now()}`;
      const { publicUrl, error: uploadError } = await uploadToB2(evidenceFile, uploadPath);

      if (uploadError) throw new Error(uploadError);

      // Insert task_evidence record - store ONLY publicUrl in file_url
      const { data, error: err } = await supabase
        .from('task_evidence')
        .insert({
          milestone_task_id: task.id,
          contract_id: task.contract_id,
          milestone_id: task.milestone_id,
          file_url: publicUrl,
          file_name: evidenceFile.name,
          file_type: fileType,
          file_size: evidenceFile.size,
          evidence_title: evidenceTitle,
          evidence_description: evidenceDescription,
          evidence_category: evidenceCategory,
          uploaded_by_email: user?.email,
          uploaded_by_user_id: user?.id,
        })
        .select();

      if (err) throw err;

      // Reset form
      setEvidenceFile(null);
      setEvidenceTitle('');
      setEvidenceDescription('');
      setEvidenceCategory('process');
      setEvidencePreview('');
      setShowEvidenceUpload(false);

      // Refresh evidence list
      fetchTaskEvidence();

      // Fetch updated task (status should auto-update to evidence_submitted)
      fetchTaskDetails();
    } catch (err) {
      console.error('Error uploading evidence:', err);
      setError('Failed to upload evidence');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleVideoUploadSuccess = async () => {
    // Reset form
    setEvidenceFile(null);
    setEvidenceTitle('');
    setEvidenceDescription('');
    setEvidenceCategory('process');
    setEvidencePreview('');
    setShowEvidenceUpload(false);
    setIsVideoUpload(false);

    // Refresh evidence list
    fetchTaskEvidence();

    // Fetch updated task
    fetchTaskDetails();
  };

  const handleVideoUploadError = (error: string) => {
    console.error('Video upload error:', error);
    setError(error);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim() || !formData.checklist_items) return;

    const updatedChecklist = [
      ...formData.checklist_items,
      {
        id: Math.random().toString(36).substr(2, 9),
        label: newChecklistItem,
        is_completed: false,
        completed_at: null,
        deadline: null,
      },
    ];

    setFormData({ ...formData, checklist_items: updatedChecklist });
    setNewChecklistItem('');
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (!formData.checklist_items) return;

    const updated = formData.checklist_items.map(item =>
      item.id === itemId
        ? {
            ...item,
            is_completed: !item.is_completed,
            completed_at: !item.is_completed ? new Date().toISOString() : null,
          }
        : item
    );

    setFormData({ ...formData, checklist_items: updated });
  };

  const handleAddVendorItem = () => {
    if (!newVendorItem.name || !newVendorItem.unit_cost || !formData.vendor_items) return;

    const total = (newVendorItem.unit_cost || 0) * (newVendorItem.quantity || 1);
    const updatedVendors = [
      ...formData.vendor_items,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: newVendorItem.name,
        unit_cost: newVendorItem.unit_cost,
        quantity: newVendorItem.quantity || 1,
        total,
        vendor_name: newVendorItem.vendor_name || '',
        vendor_contact: newVendorItem.vendor_contact || null,
      },
    ];

    setFormData({ ...formData, vendor_items: updatedVendors });
    setNewVendorItem({});
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email || !formData.assigned_contacts) return;

    const updatedContacts = [
      ...formData.assigned_contacts,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone || null,
        role: newContact.role || 'Executor',
      },
    ];

    setFormData({ ...formData, assigned_contacts: updatedContacts });
    setNewContact({});
  };

  const handleAcceptDeclaration = async () => {
    if (!taskId || !acceptedDeclaration) return;

    try {
      setSaving(true);

      const { error: err } = await supabase
        .from('milestone_tasks')
        .update({
          declaration_accepted: true,
          declaration_accepted_at: new Date().toISOString(),
          declaration_accepted_by_email: user?.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (err) throw err;

      setTask(prev => prev ? {
        ...prev,
        declaration_accepted: true,
        declaration_accepted_at: new Date().toISOString(),
        declaration_accepted_by_email: user?.email || '',
      } : null);

      setShowDeclaration(false);
      setAcceptedDeclaration(false);
    } catch (err) {
      console.error('Error accepting declaration:', err);
      setError('Failed to accept declaration');
    } finally {
      setSaving(false);
    }
  };

  const handleShareToMilestone = async (evidenceId: string) => {
    try {
      setSaving(true);

      const { data, error: err } = await supabase
        .rpc('share_task_evidence_to_milestone', {
          p_task_evidence_id: evidenceId,
          p_milestone_id: task?.milestone_id,
        });

      if (err) throw err;

      // Refresh evidence
      fetchTaskEvidence();
      setError(null);
    } catch (err) {
      console.error('Error sharing evidence:', err);
      setError('Failed to share evidence');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 pt-16">
        <div className="sticky top-16 bg-white border-b border-slate-200 shadow-sm z-40">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>

              <div className="text-center flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 break-words">Task Details</h1>
              </div>

              <div className="flex-shrink-0">
                <button className="px-4 py-2 bg-slate-200 text-slate-500 rounded-lg font-medium whitespace-nowrap" disabled>
                  Edit Task
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="h-6 w-40 bg-slate-100 rounded mb-4" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-40 bg-slate-50 rounded-lg border border-slate-200" />
                <div className="h-56 bg-slate-50 rounded-lg border border-slate-200" />
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-slate-50 rounded-lg border border-slate-200" />
                <div className="h-32 bg-slate-50 rounded-lg border border-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const completedChecklistCount = (formData.checklist_items || []).filter(item => item.is_completed).length;
  const totalChecklistCount = (formData.checklist_items || []).length;
  const vendorTotal = (formData.vendor_items || []).reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 pt-16">
      {/* Header */}
      <div className="sticky top-16 bg-white border-b border-slate-200 shadow-sm z-40">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="text-center flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 break-words">{task.title}</h1>
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium whitespace-nowrap">
                  {task.status.replace('_', ' ')}
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium whitespace-nowrap">
                  {task.priority}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap"
                >
                  Edit Task
                </button>
              ) : (
                <button
                  onClick={handleSaveTask}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium whitespace-nowrap"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Overview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Task Overview</h2>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={formData.priority || 'medium'}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.due_date ? formData.due_date.slice(0, 16) : ''}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Budget Amount
                      </label>
                      <input
                        type="number"
                        value={formData.budget_amount || ''}
                        onChange={(e) => setFormData({ ...formData, budget_amount: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Deliverables
                    </label>
                    <textarea
                      value={formData.deliverables || ''}
                      onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SOPs / Protocol
                    </label>
                    <textarea
                      value={formData.sop_protocol || ''}
                      onChange={(e) => setFormData({ ...formData, sop_protocol: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                      placeholder="Standard Operating Procedures or Protocol to be observed during execution"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {task.description && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Description</p>
                      <p className="text-slate-900">{task.description}</p>
                    </div>
                  )}

                  {task.deliverables && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Deliverables</p>
                      <p className="text-slate-900 whitespace-pre-wrap">{task.deliverables}</p>
                    </div>
                  )}

                  {task.sop_protocol && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">SOPs / Protocol</h3>
                      <p className="text-blue-800 whitespace-pre-wrap text-sm">{task.sop_protocol}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                  Checklist ({completedChecklistCount}/{totalChecklistCount})
                </h2>
              </div>

              <div className="space-y-2 mb-4">
                {(formData.checklist_items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                  >
                    <button
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        item.is_completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {item.is_completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={item.is_completed ? 'line-through text-slate-500' : 'text-slate-900'}>
                      {item.label}
                    </span>
                    {item.deadline && (
                      <span className="text-xs text-slate-500 ml-auto">
                        {new Date(item.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="Add checklist item..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleAddChecklistItem}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Assigned Contacts */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Assigned Contacts
              </h2>

              <div className="space-y-2 mb-4">
                {(formData.assigned_contacts || []).map((contact) => (
                  <div key={contact.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="font-medium text-slate-900">{contact.name}</div>
                    <div className="text-sm text-slate-600">{contact.email}</div>
                    {contact.phone && <div className="text-sm text-slate-600">{contact.phone}</div>}
                    <div className="text-xs text-slate-500 mt-1">{contact.role}</div>
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={newContact.name || ''}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="email"
                    value={newContact.email || ''}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="Email Address"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="tel"
                    value={newContact.phone || ''}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="Phone (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <select
                    value={newContact.role || 'Executor'}
                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="Executor">Executor</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Inspector">Inspector</option>
                    <option value="Other">Other</option>
                  </select>
                  <button
                    onClick={handleAddContact}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Key Information</h3>

              <div className="space-y-4">
                {task.budget_amount && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-600">Task Budget</p>
                      <p className="font-semibold text-slate-900">{task.budget_amount.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {task.due_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-600">Due Date</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {vendorTotal > 0 && (
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-600">Vendor Total</p>
                      <p className="font-semibold text-slate-900">{vendorTotal.toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600">Evidence Uploaded</p>
                    <p className="font-semibold text-slate-900">{evidence.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Declaration */}
            {!task.declaration_accepted ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="font-bold text-amber-900 mb-3">Declaration Required</h3>
                <p className="text-sm text-amber-800 mb-4">{task.declaration_text}</p>

                {!showDeclaration ? (
                  <button
                    onClick={() => setShowDeclaration(true)}
                    className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
                  >
                    Review & Accept
                  </button>
                ) : (
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedDeclaration}
                        onChange={(e) => setAcceptedDeclaration(e.target.checked)}
                        className="mt-1 w-4 h-4"
                      />
                      <span className="text-xs text-amber-800">
                        I declare that the above statement is true and accurate. I accept full responsibility and liability for the work completed.
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAcceptDeclaration}
                        disabled={!acceptedDeclaration || saving}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {saving ? 'Accepting...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => setShowDeclaration(false)}
                        className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-bold text-green-900 mb-2">Declaration Accepted</h3>
                <p className="text-xs text-green-700">
                  Accepted on {new Date(task.declaration_accepted_at || '').toLocaleDateString()}
                </p>
                <p className="text-xs text-green-700">by {task.declaration_accepted_by_email}</p>
              </div>
            )}

            {/* Vendor Items */}
            {(formData.vendor_items || []).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">Vendor Items</h3>
                <div className="space-y-2">
                  {(formData.vendor_items || []).map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-600">
                          {item.quantity} × {item.unit_cost.toLocaleString()}
                        </p>
                      </div>
                      <p className="font-semibold text-slate-900">{item.total.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">Add Vendor Item</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newVendorItem.name || ''}
                    onChange={(e) => setNewVendorItem({ ...newVendorItem, name: e.target.value })}
                    placeholder="Item Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    value={newVendorItem.unit_cost || ''}
                    onChange={(e) => setNewVendorItem({ ...newVendorItem, unit_cost: parseFloat(e.target.value) })}
                    placeholder="Unit Cost"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    value={newVendorItem.quantity || 1}
                    onChange={(e) => setNewVendorItem({ ...newVendorItem, quantity: parseInt(e.target.value) })}
                    placeholder="Quantity"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="text"
                    value={newVendorItem.vendor_name || ''}
                    onChange={(e) => setNewVendorItem({ ...newVendorItem, vendor_name: e.target.value })}
                    placeholder="Vendor Name (optional)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleAddVendorItem}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evidence Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Evidence & Proof of Work
            </h2>
            <button
              onClick={() => setShowEvidenceUpload(!showEvidenceUpload)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Evidence
            </button>
          </div>

          {showEvidenceUpload && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <input
                type="text"
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
                placeholder="Evidence Title *"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />

              <select
                value={evidenceCategory}
                onChange={(e) => setEvidenceCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="process">Process</option>
                <option value="safety">Safety</option>
                <option value="measurement">Measurement</option>
                <option value="specification">Specification</option>
                <option value="other">Other</option>
              </select>

              {isVideoUpload && evidenceFile ? (
                <>
                  <VideoUploadEvidence
                    taskId={task.id}
                    milestoneId={task.milestone_id}
                    contractId={task.contract_id}
                    userId={user?.id || ''}
                    userEmail={user?.email || ''}
                    evidenceTitle={evidenceTitle}
                    evidenceDescription={evidenceDescription}
                    evidenceCategory={evidenceCategory}
                    onSuccess={handleVideoUploadSuccess}
                    onError={handleVideoUploadError}
                  />
                  <button
                    onClick={() => {
                      setShowEvidenceUpload(false);
                      setEvidenceFile(null);
                      setEvidenceTitle('');
                      setEvidenceDescription('');
                      setIsVideoUpload(false);
                    }}
                    className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-slate-400 transition">
                    <input
                      type="file"
                      onChange={handleEvidenceFileSelect}
                      className="hidden"
                      id="evidence-file"
                    />
                    <label htmlFor="evidence-file" className="cursor-pointer block">
                      {evidenceFile ? (
                        <div>
                          <p className="text-sm font-medium text-slate-900">{evidenceFile.name}</p>
                          {evidencePreview && (
                            <img src={evidencePreview} alt="Preview" className="mt-2 h-32 mx-auto rounded" />
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-600">
                          <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Click to upload or drag and drop</p>
                          <p className="text-xs text-slate-500">Image, video, or document</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleUploadEvidence}
                      disabled={!evidenceFile || !evidenceTitle || uploadingEvidence}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {uploadingEvidence ? 'Uploading...' : 'Upload'}
                    </button>
                    <button
                      onClick={() => {
                        setShowEvidenceUpload(false);
                        setEvidenceFile(null);
                        setEvidenceTitle('');
                        setEvidenceDescription('');
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Evidence Gallery */}
          {evidence.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No evidence uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidence.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition">
                  {/* Preview - always use file_url */}
                  {item.file_type === 'image' && (
                    <img src={item.file_url} alt={item.evidence_title} className="w-full h-40 object-cover" />
                  )}

                  {item.file_type === 'video' && (
                    <video src={item.file_url} className="w-full h-40 object-cover bg-black" controls></video>
                  )}

                  {item.file_type === 'document' && (
                    <div className="w-full h-40 bg-slate-100 flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs text-slate-600 font-medium truncate px-2">{item.file_name}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <h4 className="font-medium text-slate-900">{item.evidence_title}</h4>
                    {item.evidence_description && (
                      <p className="text-sm text-slate-600 mt-1">{item.evidence_description}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(item.uploaded_at).toLocaleDateString()}
                    </p>

                    {/* Download link for non-image files */}
                    {item.file_type !== 'image' && (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Download {item.file_type === 'document' ? 'Document' : 'File'} →
                      </a>
                    )}

                    {!item.shared_field_verification_id && (
                      <button
                        onClick={() => handleShareToMilestone(item.id)}
                        disabled={saving}
                        className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        Share to Contracts
                      </button>
                    )}

                    {item.shared_field_verification_id && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
                        <p className="text-xs text-green-700 font-medium">✓ Shared to Contracts</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
