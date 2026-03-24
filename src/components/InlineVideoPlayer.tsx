import React, { useState } from 'react';
import { X } from 'lucide-react';
import MuxPlayer from './MuxPlayer';

interface InlineVideoPlayerProps {
  isPlaying: boolean;
  content: {
    id: string;
    title: string;
    thumbnail_url: string;
    content_url: string;
  };
  onClose: () => void;
}

export default function InlineVideoPlayer({
  isPlaying,
  content,
  onClose,
}: InlineVideoPlayerProps) {
  if (!isPlaying) return null;

  // Extract playback ID from Mux stream URL
  const getPlaybackId = () => {
    if (!content.content_url) return '';
    
    // If it's a Mux stream URL (https://stream.mux.com/{playback-id}.m3u8)
    if (content.content_url.includes('stream.mux.com')) {
      const match = content.content_url.match(/stream\.mux\.com\/([a-zA-Z0-9]+)/);
      return match ? match[1] : '';
    }
    
    // If it's already a playback ID
    if (!content.content_url.includes('://')) {
      return content.content_url;
    }
    
    return '';
  };

  const playbackId = getPlaybackId();

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Video Player */}
      {playbackId ? (
        <MuxPlayer
          playbackId={playbackId}
          thumbnailUrl={content.thumbnail_url}
          title={content.title}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-red-400">Unable to load video</p>
        </div>
      )}
    </div>
  );
}
