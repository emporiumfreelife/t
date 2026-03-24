import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Image as ImageIcon, Headphones, Heart, Share2, Filter, Search, Star, Download, Rss, Eye, Trash2, Lightbulb, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePreloadedData } from '../context/DataPreloadContext';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../lib/adminUtils';
import { useMediaPageLike, useMediaPageFollow } from '../hooks/useMediaPageInteraction';
import { useContentDeletion } from '../hooks/useContentDeletion';
import { trackVideoView } from '../hooks/useVideoViewTracking';
import { updateDurationInDatabase } from '../lib/updateDurationInDatabase';
import { useDragReorder } from '../hooks/useDragReorder';
import DeleteFromDestinationModal from '../components/DeleteFromDestinationModal';
import VideoPlaybackModal from '../components/VideoPlaybackModal';
import VideoUploadWithMux from '../components/VideoUploadWithMux';
import MediaItemContextMenu from '../components/MediaItemContextMenu';
import FeaturedContentModal from '../components/FeaturedContentModal';

interface ContentItem {
  id: string;
  user_id: string;
  title: string;
  creator: string;
  description?: string;
  thumbnail_url: string;
  content_url: string;
  like_count: number;
  views_count?: number;
  duration?: string;
  read_time?: string;
  category?: string;
  is_premium: boolean;
  type: string;
  created_at: string;
  display_order?: number;
}

const categories = {
  music: ['all', 'latest-release', 'new-talent', 'greatest-of-all-time', 'DJ-mixtapes', 'UG-Unscripted', 'Afrobeat', 'hip-hop', 'RnB', 'Others', 'Challenges'],
  movies: ['all', 'action', 'comedy', 'drama', 'horror', 'romance', 'science-fiction', 'thriller', 'documentary', 'animation', 'others'],
  spotlight: ['all', 'creator-space', 'tv-shows', 'documentaries', 'interviews', 'q-and-a', 'features', 'awards', 'masterpiece', 'press-release'],
  podcast: ['all', 'interviews', 'behind-the-scenes', 'radio', 'live'],
  blog: ['all', 'lifestyle', 'legacy', 'articles', 'insights'],
  gallery: ['all', 'design', 'photography', 'art', 'others'],
  contests: ['all', 'Africa-votes', 'UGHHA', 'ASFA'],
};

const tabs = [
  { id: 'music', label: 'Music', icon: <Headphones className="w-5 h-5" /> },
  { id: 'movies', label: 'Movies', icon: <Play className="w-5 h-5" /> },
  { id: 'spotlight', label: 'Spotlight', icon: <Lightbulb className="w-5 h-5 rotate-180" /> },
  { id: 'podcast', label: 'Podcast', icon: <Mic className="w-5 h-5" /> },
  { id: 'blog', label: 'Blog', icon: <Rss className="w-5 h-5" /> },
  { id: 'gallery', label: 'Gallery', icon: <ImageIcon className="w-5 h-5" /> },
  { id: 'contests', label: 'Contests', icon: <Star className="w-5 h-5" /> },
];

export default function Media() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preloadedData = usePreloadedData();

  // Initialize with preloaded data for instant display (zero delay)
  const [contentItems, setContentItems] = useState<ContentItem[]>(preloadedData.mediaContent);

  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userFollows, setUserFollows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('music');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; contentId: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [playingContent, setPlayingContent] = useState<ContentItem | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [musicDisplayMode, setMusicDisplayMode] = useState<'audio' | 'video'>('video');
  const [featuredModal, setFeaturedModal] = useState<{ isOpen: boolean; content: ContentItem | null }>({ isOpen: false, content: null });
  const [isAdmin] = useState(user?.email ? isUserAdmin(user.email) : false);
  const [featuredContentIds, setFeaturedContentIds] = useState<Set<string>>(new Set());
  const [highlightedContentId, setHighlightedContentId] = useState<string | null>(null);
  const contentRefMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const { toggleLike } = useMediaPageLike();
  const { toggleFollow } = useMediaPageFollow();
  const { deleteFromDestination } = useContentDeletion();
  const { draggedItem, handleDragStart, handleDragOver, handleDrop, handleDragEnd, saveOrderToDatabase } = useDragReorder();
  const [reorderedItems, setReorderedItems] = useState<ContentItem[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const getTabType = (contentType: string) => {
    switch (contentType) {
      case 'music-video':
      case 'audio-music':
        return 'music';
      case 'movie':
        return 'movies';
      case 'tv-show':
      case 'documentary':
      case 'interview':
      case 'feature':
        return 'spotlight';
      case 'podcast':
        return 'podcast';
      case 'blog':
        return 'blog';
      case 'image':
        return 'gallery';
      case 'contest':
        return 'contests';
      default:
        return null;
    }
  };

  useEffect(() => {
    // Fetch fresh content in background to keep data updated
    fetchContent();
    if (user) fetchUserInteractions();
    fetchFeaturedContentIds();
  }, [user]);

  useEffect(() => {
    // Check if coming from featured content click
    const featuredId = searchParams.get('featuredId');
    if (featuredId && contentItems.length > 0) {
      // Find the featured content to determine its tab and category
      const featuredContent = contentItems.find(item => item.id === featuredId);
      if (featuredContent) {
        // Set the correct tab so content is visible
        const contentTab = getTabType(featuredContent.type);
        setActiveTab(contentTab);
        setSelectedCategory('all');
      }

      setHighlightedContentId(featuredId);

      // Wait for DOM to render - use setTimeout to ensure content is filtered and rendered
      setTimeout(() => {
        const element = contentRefMap.current.get(featuredId);
        if (element && element.scrollIntoView) {
          try {
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
          } catch (e) {
            console.error('Error scrolling to element:', e);
          }
        }
      }, 100);

      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedContentId(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, contentItems]);

  useEffect(() => {
    setSelectedCategory('all');
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToRealTimeUpdates();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase.rpc('get_content_by_destination', {
        destination: 'media'
      });

      if (error) {
        console.error('Error fetching content:', error);
        return;
      }

      if (data) {
        // Prefetch all thumbnail URLs to prevent image flicker when updating state
        const prefetchPromises = data.map(
          (item) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = item.thumbnail_url;
            })
        );
        await Promise.all(prefetchPromises);

        setContentItems(data);
        // Cache for instant load next time (localStorage for persistence)
        try {
          localStorage.setItem('media_content_thumbnails', JSON.stringify(data));
        } catch (e) {
          // localStorage might be full, ignore
        }
        sessionStorage.setItem('media_content_cache', JSON.stringify(data));

        // Auto-update durations for videos with "0:00" in background (non-blocking)
        data.forEach((item) => {
          if ((item.duration === '0:00' || !item.duration) && (item.type === 'music-video' || item.type === 'movie' || item.type === 'audio-music')) {
            updateDurationInDatabase(item.id, item.content_url)
              .then((newDuration) => {
                if (newDuration) {
                  setContentItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, duration: newDuration } : i))
                  );
                }
              })
              .catch((err) => {
                console.error(`Failed to auto-update duration for ${item.id}:`, err);
              });
          }
        });
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchUserInteractions = async () => {
    if (!user) return;

    try {
      const { data: likes } = await supabase
        .from('media_page_likes')
        .select('content_id')
        .eq('user_id', user.id);

      if (likes) {
        setUserLikes(new Set(likes.map((l: any) => l.content_id)));
      }

      const { data: follows } = await supabase
        .from('media_page_follows')
        .select('creator_name')
        .eq('follower_id', user.id);

      if (follows) {
        setUserFollows(new Set(follows.map((f: any) => f.creator_name)));
      }
    } catch (err) {
      console.error('Error fetching interactions:', err);
    }
  };

  const fetchFeaturedContentIds = async () => {
    try {
      const { data, error } = await supabase
        .from('featured_releases')
        .select('media_content_id')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching featured content:', error);
        return;
      }

      if (data) {
        setFeaturedContentIds(new Set(data.map((item: any) => item.media_content_id)));
      }
    } catch (err) {
      console.error('Error fetching featured content IDs:', err);
    }
  };

  const subscribeToRealTimeUpdates = () => {
    const contentChannel = supabase
      .channel('public:media_page_content')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_page_content',
        },
        (payload: any) => {
          setContentItems((prev) =>
            prev.map((item) =>
              item.id === payload.new.id
                ? {
                    ...item,
                    like_count: payload.new.like_count,
                  }
                : item
            )
          );
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('public:media_page_likes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_page_likes',
        },
        () => {
          if (user) {
            fetchUserInteractions();
          }
        }
      )
      .subscribe();

    const featuredChannel = supabase
      .channel('public:featured_releases')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'featured_releases',
        },
        () => {
          fetchFeaturedContentIds();
        }
      )
      .subscribe();

    return () => {
      contentChannel.unsubscribe();
      likesChannel.unsubscribe();
      featuredChannel.unsubscribe();
    };
  };

  const handleToggleLike = useCallback(
    async (contentId: string) => {
      if (!user) {
        navigate('/signin');
        return;
      }

      const isCurrentlyLiked = userLikes.has(contentId);
      const previousLikes = userLikes;
      const previousItems = contentItems;

      setUserLikes((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) {
          next.delete(contentId);
        } else {
          next.add(contentId);
        }
        return next;
      });

      setContentItems((prev) =>
        prev.map((item) =>
          item.id === contentId
            ? { ...item, like_count: isCurrentlyLiked ? item.like_count - 1 : item.like_count + 1 }
            : item
        )
      );

      const result = await toggleLike(contentId, isCurrentlyLiked, user.id);

      if (!result.success) {
        setUserLikes(previousLikes);
        setContentItems(previousItems);
      }
    },
    [user, userLikes, contentItems, toggleLike, navigate]
  );

  const handleToggleFollow = useCallback(
    async (creatorName: string) => {
      if (!user) {
        navigate('/signin');
        return;
      }

      const isCurrentlyFollowing = userFollows.has(creatorName);
      const previousFollows = userFollows;

      setUserFollows((prev) => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) {
          next.delete(creatorName);
        } else {
          next.add(creatorName);
        }
        return next;
      });

      const result = await toggleFollow(creatorName, isCurrentlyFollowing, user.id);

      if (!result.success) {
        setUserFollows(previousFollows);
      }
    },
    [user, userFollows, toggleFollow, navigate]
  );

  const handleDeleteClick = (contentId: string, contentTitle: string) => {
    setDeleteModal({ isOpen: true, contentId, title: contentTitle });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;

    setIsDeleting(true);
    const result = await deleteFromDestination(deleteModal.contentId, 'media');

    if (result.success) {
      setContentItems((prev) => prev.filter((item) => item.id !== deleteModal.contentId));
      setDeleteModal(null);
    } else {
      console.error('Failed to delete from Media:', result.error);
    }

    setIsDeleting(false);
  };

  const handleDeleteCancel = () => {
    setDeleteModal(null);
  };

  const handlePlayClick = (item: ContentItem) => {
    setPlayingContent(item);
    setIsPlayerOpen(true);
    trackVideoView(item.id);
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setPlayingContent(null);
  };

  const handleVideoUploadSuccess = () => {
    // Refresh content when new video is uploaded
    fetchContent();
  };

  const handleFeatureClick = (contentId: string) => {
    const item = contentItems.find(i => i.id === contentId);
    if (item) {
      setFeaturedModal({ isOpen: true, content: item });
    }
  };

  const handleFeatureSave = async (data: {
    media_content_id: string;
    admin_edited_title: string | null;
    admin_edited_creator: string | null;
  }) => {
    try {
      // Check if this content is already featured
      const { data: existingFeatured } = await supabase
        .from('featured_releases')
        .select('id')
        .eq('media_content_id', data.media_content_id)
        .single();

      if (existingFeatured) {
        // Update existing featured content
        const { error } = await supabase
          .from('featured_releases')
          .update({
            admin_edited_title: data.admin_edited_title,
            admin_edited_creator: data.admin_edited_creator,
            updated_at: new Date().toISOString()
          })
          .eq('media_content_id', data.media_content_id);

        if (error) throw error;
      } else {
        // Insert new featured content
        const { error } = await supabase
          .from('featured_releases')
          .insert([
            {
              media_content_id: data.media_content_id,
              admin_edited_title: data.admin_edited_title,
              admin_edited_creator: data.admin_edited_creator,
              admin_id: user?.id,
              is_active: true,
              display_order: 0
            }
          ]);

        if (error) throw error;
      }

      // Close modal after successful save
      setFeaturedModal({ isOpen: false, content: null });
      // Update featured content IDs
      setFeaturedContentIds((prev) => new Set(prev).add(data.media_content_id));
    } catch (err) {
      console.error('Error featuring content:', err);
      throw err;
    }
  };

  const handleUnfeatureClick = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from('featured_releases')
        .delete()
        .eq('media_content_id', contentId);

      if (error) throw error;

      // Update featured content IDs
      setFeaturedContentIds((prev) => {
        const next = new Set(prev);
        next.delete(contentId);
        return next;
      });
    } catch (err) {
      console.error('Error unfeaturing content:', err);
      alert('Failed to remove from featured. Please try again.');
    }
  };

  const handleDropMedia = useCallback(
    async (dropIndex: number) => {
      if (!draggedItem) return;

      const dragIndex = draggedItem.index;
      if (dragIndex === dropIndex) return;

      // Work with FULL contentItems array for reordering
      const allItems = [...contentItems];
      const draggedItemData = allItems[dragIndex];

      if (!draggedItemData) return;

      // Remove from original position
      const [movedItem] = allItems.splice(dragIndex, 1);

      // Insert at new position
      allItems.splice(dropIndex, 0, movedItem);

      // Update display_order for ALL items - starting from 1, not 0
      const updatedItems = allItems.map((item, index) => ({
        ...item,
        display_order: index + 1,
      }));

      setIsSavingOrder(true);
      const result = await saveOrderToDatabase('media_page_content', updatedItems);

      if (result.success) {
        setContentItems(updatedItems);
        // Clear cache so fresh data is fetched on page reload
        sessionStorage.removeItem('media_content_cache');
      } else {
        alert('Failed to save new order. Please try again.');
      }

      setIsSavingOrder(false);
    },
    [draggedItem, contentItems, saveOrderToDatabase]
  );

  const filteredContent = contentItems
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .filter((item) => {
    const itemTabType = getTabType(item.type);
    const matchesTab = itemTabType === activeTab;

    const categoryMatches =
      selectedCategory === 'all' ||
      item.type === selectedCategory ||
      item.category === selectedCategory;

    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.creator.toLowerCase().includes(searchQuery.toLowerCase());

    // For Music tab, filter by display mode (audio vs video)
    let matchesDisplayMode = true;
    if (activeTab === 'music') {
      if (musicDisplayMode === 'audio') {
        matchesDisplayMode = item.type === 'audio-music';
      } else if (musicDisplayMode === 'video') {
        matchesDisplayMode = item.type === 'music-video';
      }
    }

    return matchesTab && categoryMatches && matchesSearch && matchesDisplayMode;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'music-video':
      case 'movie':
        return <Play className="w-12 h-12 text-white" />;
      case 'audio-music':
        return <Headphones className="w-12 h-12 text-white" />;
      case 'blog':
        return <Rss className="w-12 h-12 text-white" />;
      case 'image':
        return <ImageIcon className="w-12 h-12 text-white" />;
      default:
        return <Play className="w-12 h-12 text-white" />;
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-playfair font-bold text-white mb-2">Media</h1>
          <p className="text-gray-300">Discover and support amazing content of your choice - free from distracting adverts</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 p-2 rounded-xl overflow-x-auto whitespace-nowrap bg-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMusicDisplayMode('video');
              }}
              className={`flex-shrink-0 flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search and Filters with Music Display Mode Toggle */}
        <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:gap-6">
          {/* Search bar */}
          <div className="relative flex-1 min-w-0 md:flex-1 md:min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'movies' ? 'movies' : activeTab === 'music' ? 'music' : activeTab === 'spotlight' ? 'spotlight' : activeTab === 'podcast' ? 'podcasts' : activeTab === 'blog' ? 'articles & blogs' : activeTab === 'gallery' ? 'images & galleries' : activeTab === 'contests' ? 'contests' : 'content'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 rounded-xl border border-slate-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Music Filter and Results - Mobile Layout */}
          {activeTab === 'music' && (
            <div className="md:hidden flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <Filter className="text-gray-400 w-5 h-5 flex-shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 text-sm bg-slate-800 rounded-xl border border-slate-700 text-white focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                >
                  {categories[activeTab as keyof typeof categories]?.map((category) => (
                    <option key={category} value={category} className="bg-slate-700">
                      {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-gray-400 flex-shrink-0">
                <span className="text-sm whitespace-nowrap">{filteredContent.length}</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 flex-shrink-0 ml-4">
                <button
                  onClick={() => setMusicDisplayMode('video')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    musicDisplayMode === 'video'
                      ? 'bg-gradient-to-r from-red-800 via-rose-700 to-red-950 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Video
                </button>
                <button
                  onClick={() => setMusicDisplayMode('audio')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    musicDisplayMode === 'audio'
                      ? 'bg-gradient-to-r from-emerald-800 via-teal-700 to-green-950 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Audio
                </button>
              </div>
            </div>
          )}

          {/* Filter and Results for non-music tabs - Mobile/Desktop */}
          {activeTab !== 'music' && (
            <div className="flex items-center gap-4 flex-1 md:flex-initial md:ml-auto">
              <div className="flex items-center space-x-2">
                <Filter className="text-gray-400 w-5 h-5" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 text-white focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                >
                  {categories[activeTab as keyof typeof categories]?.map((category) => (
                    <option key={category} value={category} className="bg-slate-700">
                      {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <span className="text-sm whitespace-nowrap">{filteredContent.length} results</span>
              </div>
            </div>
          )}

          {/* Music Filter and Video/Audio Toggle - Desktop Layout */}
          {activeTab === 'music' && (
            <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <Filter className="text-gray-400 w-5 h-5 flex-shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 min-w-0 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 text-white focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                >
                  {categories[activeTab as keyof typeof categories]?.map((category) => (
                    <option key={category} value={category} className="bg-slate-700">
                      {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 flex-shrink-0">
                <span className="text-sm whitespace-nowrap">{filteredContent.length} results</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1 flex-shrink-0 ml-4">
                <button
                  onClick={() => setMusicDisplayMode('video')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    musicDisplayMode === 'video'
                      ? 'bg-gradient-to-r from-red-800 via-rose-700 to-red-950 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Video
                </button>
                <button
                  onClick={() => setMusicDisplayMode('audio')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    musicDisplayMode === 'audio'
                      ? 'bg-gradient-to-r from-emerald-800 via-teal-700 to-green-950 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Audio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        {filteredContent.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) contentRefMap.current.set(item.id, el);
                }}
                draggable={isAdmin}
                onDragStart={(e) => {
                  if (isAdmin) {
                    const fullArrayIndex = contentItems.findIndex(i => i.id === item.id);
                    handleDragStart(e, item.id, fullArrayIndex);
                  }
                }}
                onDragOver={(e) => {
                  if (isAdmin) {
                    handleDragOver(e);
                  }
                }}
                onDrop={(e) => {
                  if (isAdmin) {
                    const fullArrayIndex = contentItems.findIndex(i => i.id === item.id);
                    handleDropMedia(fullArrayIndex);
                  }
                }}
                onDragEnd={handleDragEnd}
                className={`bg-slate-800 rounded-lg overflow-hidden hover:bg-slate-700 transition-all duration-300 group ${
                  isAdmin ? 'cursor-move' : ''
                } ${
                  draggedItem?.id === item.id && isAdmin
                    ? 'opacity-50 ring-2 ring-blue-400'
                    : ''
                } ${
                  highlightedContentId === item.id
                    ? 'ring-2 ring-rose-400 shadow-lg shadow-rose-400/50 scale-105 animate-pulse'
                    : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-800">
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Overlay */}
                  <button
                    onClick={() => handlePlayClick(item)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer hover:bg-black/60"
                  >
                    {getIcon(item.type)}
                  </button>

                  {/* Premium Badge */}
                  {item.is_premium && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold rounded-full">
                      PREMIUM
                    </div>
                  )}

                  {/* Duration */}
                  {item.duration && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                      {item.duration}
                    </div>
                  )}
                </div>

                {/* Content Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold line-clamp-2 flex-1">{item.title}</h3>
                    {isAdmin && (
                      <MediaItemContextMenu
                        contentId={item.id}
                        title={item.title}
                        creator={item.creator}
                        thumbnail={item.thumbnail_url}
                        type={item.type}
                        onFeatureClick={handleFeatureClick}
                        isFeatured={featuredContentIds.has(item.id)}
                        onUnfeatureClick={handleUnfeatureClick}
                      />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{item.creator}</p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    {item.views_count !== undefined && (
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{item.views_count.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{item.like_count.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleFollow(item.creator)}
                      className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                    >
                      {userFollows.has(item.creator) ? 'Following' : 'Follow'}
                    </button>
                    <button
                      onClick={() => handleToggleLike(item.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        userLikes.has(item.id)
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Heart className="w-4 h-4" fill={userLikes.has(item.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button className="p-2 bg-slate-700 text-gray-400 hover:text-white rounded-lg transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                    {user?.id === item.user_id && (
                      <button
                        onClick={() => handleDeleteClick(item.id, item.title)}
                        className="p-2 glass-effect text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete from Media"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Premium CTA */}
                  {item.is_premium && user?.tier === 'free' && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 rounded-lg">
                      <p className="text-yellow-400 text-xs mb-2">Premium content - Subscribe to unlock</p>
                      <button className="w-full py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold rounded">
                        Subscribe Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : preloadedData.isLoaded ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              {activeTab === 'music' && <Headphones className="w-16 h-16 mx-auto mb-4" />}
              {activeTab === 'movies' && <Play className="w-16 h-16 mx-auto mb-4" />}
              {activeTab === 'spotlight' && <Lightbulb className="w-16 h-16 mx-auto mb-4 rotate-180" />}
              {activeTab === 'podcast' && <Mic className="w-16 h-16 mx-auto mb-4" />}
              {activeTab === 'blog' && <Rss className="w-16 h-16 mx-auto mb-4" />}
              {activeTab === 'gallery' && <ImageIcon className="w-16 h-16 mx-auto mb-4" />}
              {activeTab === 'contests' && <Star className="w-16 h-16 mx-auto mb-4" />}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No content available</h3>
            <p className="text-gray-400">Check back later for new {activeTab} content!</p>
          </div>
        ) : null}
      </div>

      {deleteModal && (
        <DeleteFromDestinationModal
          isOpen={deleteModal.isOpen}
          destination="media"
          contentTitle={deleteModal.title}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isLoading={isDeleting}
        />
      )}

      {playingContent && (
        <VideoPlaybackModal
          isOpen={isPlayerOpen}
          content={playingContent}
          isLiked={userLikes.has(playingContent.id)}
          onClose={handleClosePlayer}
          onLikeToggle={handleToggleLike}
          onFollowToggle={handleToggleFollow}
          isFollowing={userFollows.has(playingContent.creator)}
        />
      )}

      <FeaturedContentModal
        isOpen={featuredModal.isOpen}
        content={featuredModal.content}
        onClose={() => setFeaturedModal({ isOpen: false, content: null })}
        onFeatureSave={handleFeatureSave}
      />

      {user && (
        <VideoUploadWithMux
          userId={user.id}
          userName={user.name}
          onSuccess={handleVideoUploadSuccess}
        />
      )}
    </div>
  );
}
