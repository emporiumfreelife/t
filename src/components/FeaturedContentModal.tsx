import React, { useState, useEffect } from 'react';
import { X, Play, Star } from 'lucide-react';

interface ContentData {
  id: string;
  title: string;
  creator: string;
  type: string;
  thumbnail?: string;
  thumbnail_url?: string;
  description?: string;
}

interface FeaturedContentModalProps {
  isOpen: boolean;
  content: ContentData | null;
  onClose: () => void;
  onFeatureSave: (data: {
    media_content_id: string;
    admin_edited_title: string | null;
    admin_edited_creator: string | null;
  }) => Promise<void>;
}

export default function FeaturedContentModal({
  isOpen,
  content,
  onClose,
  onFeatureSave
}: FeaturedContentModalProps) {
  const [editedTitle, setEditedTitle] = useState('');
  const [editedCreator, setEditedCreator] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (content) {
      setEditedTitle(content.title);
      setEditedCreator(content.creator);
      setError(null);
    }
  }, [content]);

  if (!isOpen || !content) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      await onFeatureSave({
        media_content_id: content.id,
        admin_edited_title: editedTitle !== content.title ? editedTitle : null,
        admin_edited_creator: editedCreator !== content.creator ? editedCreator : null
      });
      onClose();
    } catch (err) {
      console.error('Error saving featured content:', err);
      setError(err instanceof Error ? err.message : 'Failed to feature content. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900 z-10">
          <h2 className="text-2xl font-bold text-white">Feature Content Preview</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview - Shows how it will appear in Featured Releases */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">FEATURED PREVIEW</h3>
            <div className="glass-effect rounded-2xl overflow-hidden hover-lift">
              <div className="relative aspect-video bg-gray-800 group">
                <img
                  src={content.thumbnail || content.thumbnail_url}
                  alt={editedTitle}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" />
                </div>
                <div className="absolute top-2 left-2 px-2 py-1 bg-rose-500/80 text-white text-xs font-bold rounded-full">
                  {content.type}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-white font-semibold mb-1">{editedTitle}</h3>
                <p className="text-gray-400 text-sm">by {editedCreator}</p>
              </div>
            </div>
          </div>

          {/* Edit Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-400">EDIT FIELDS (OPTIONAL)</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Content title"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Leave as-is or edit for featured display</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Creator/By
              </label>
              <input
                type="text"
                value={editedCreator}
                onChange={(e) => setEditedCreator(e.target.value)}
                placeholder="Creator name"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Leave as-is or edit for featured display</p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <span className="font-semibold">ℹ Auto-sync:</span> This content will appear in the Featured Releases section on the landing page. Changes to the original media (thumbnail, video, etc.) will automatically sync unless you've made custom edits above.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              {isSaving ? 'Featuring...' : 'Feature This Content'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
