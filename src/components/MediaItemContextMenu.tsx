import React, { useState } from 'react';
import { MoreVertical, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isUserAdmin } from '../lib/adminUtils';

interface MediaItemContextMenuProps {
  contentId: string;
  title: string;
  creator: string;
  thumbnail: string;
  type: string;
  onFeatureClick: (contentId: string) => void;
  isFeatured?: boolean;
  onUnfeatureClick?: (contentId: string) => void;
}

export default function MediaItemContextMenu({
  contentId,
  title,
  creator,
  thumbnail,
  type,
  onFeatureClick,
  isFeatured = false,
  onUnfeatureClick
}: MediaItemContextMenuProps) {
  const { user } = useAuth();
  const isAdmin = user?.email ? isUserAdmin(user.email) : false;
  const [isOpen, setIsOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
        title="Content options"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
            {!isFeatured ? (
              // Show "Feature this Content" when not featured
              <button
                onClick={() => {
                  onFeatureClick(contentId);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-2 rounded-lg transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="font-medium">Feature this Content</span>
              </button>
            ) : (
              // Show "Remove from Featured" when already featured
              <button
                onClick={() => {
                  onUnfeatureClick?.(contentId);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-2 rounded-lg transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <Trash2 className="w-4 h-4 text-orange-400" />
                <span className="font-medium">Remove from Featured</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
