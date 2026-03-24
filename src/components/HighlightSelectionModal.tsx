import React, { useState } from 'react';
import { X, Star } from 'lucide-react';

interface HighlightSelectionModalProps {
  isOpen: boolean;
  portfolioContent: any[];
  highlightedIds: string[];
  onToggleHighlight: (contentId: string, isCurrentlyHighlighted: boolean) => Promise<void>;
  onClose: () => void;
}

export default function HighlightSelectionModal({
  isOpen,
  portfolioContent,
  highlightedIds,
  onToggleHighlight,
  onClose,
}: HighlightSelectionModalProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = async (contentId: string) => {
    const isHighlighted = highlightedIds.includes(contentId);
    setTogglingId(contentId);
    try {
      await onToggleHighlight(contentId, isHighlighted);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-800 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white">Select Content to Highlight</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {portfolioContent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No portfolio content available. Upload content to your portfolio first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {portfolioContent.map((item) => {
                const isHighlighted = highlightedIds.includes(item.id);
                const isToggling = togglingId === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    disabled={isToggling}
                    className="relative group text-left transition-all hover:scale-105 disabled:opacity-50"
                  >
                    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className={`absolute inset-0 transition-all ${
                          isHighlighted
                            ? 'bg-rose-500/70'
                            : 'bg-black/30 group-hover:bg-black/50'
                        }`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Star
                          className={`w-6 h-6 transition-all ${
                            isHighlighted
                              ? 'text-white fill-white'
                              : 'text-gray-300 opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-white font-medium text-sm truncate">
                        {item.title}
                      </h4>
                      <p className="text-gray-400 text-xs truncate">
                        {item.creator}
                      </p>
                    </div>
                    {isHighlighted && (
                      <div className="absolute top-2 right-2 bg-rose-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        Highlighted
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
