import React, { useState } from 'react';
import { X, Plus, Loader } from 'lucide-react';
import type { PortfolioSkill } from '../lib/portfolioService';

interface AddSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (skill: PortfolioSkill) => Promise<any>;
  isLoading?: boolean;
}

export default function AddSkillModal({ isOpen, onClose, onAdd, isLoading = false }: AddSkillModalProps) {
  const [formData, setFormData] = useState({
    skill_name: '',
    proficiency_level: 'intermediate' as const,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.skill_name.trim()) {
      setError('Skill name is required');
      return;
    }

    const result = await onAdd({
      skill_name: formData.skill_name.trim(),
      proficiency_level: formData.proficiency_level,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setFormData({ skill_name: '', proficiency_level: 'intermediate' });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-effect p-6 rounded-2xl max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Add Skill</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Skill Name</label>
            <input
              type="text"
              value={formData.skill_name}
              onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
              placeholder="e.g., React, UI Design, Leadership"
              className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-rose-400 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Proficiency Level</label>
            <select
              value={formData.proficiency_level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  proficiency_level: e.target.value as 'beginner' | 'intermediate' | 'advanced' | 'expert',
                })
              }
              className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-rose-400 outline-none transition-colors"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Skill
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
