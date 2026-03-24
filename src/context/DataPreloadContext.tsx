import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface UserStats {
  portfolio_views: number;
  followers: number;
  rating: number;
  loyalty_points: number;
}

interface PreloadedData {
  mediaContent: any[];
  masterclassContent: any[];
  publishedEvents: any[];
  allJobs: any[];
  userStats: UserStats | null;
  isLoaded: boolean;
}

const DataPreloadContext = createContext<PreloadedData | null>(null);

export function DataPreloadProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PreloadedData>({
    mediaContent: [],
    masterclassContent: [],
    publishedEvents: [],
    allJobs: [],
    userStats: null,
    isLoaded: false,
  });

  // Preload public data on app startup
  useEffect(() => {
    const preloadPublicData = async () => {
      try {
        // Fetch all critical public data in parallel
        const [mediaRes, masterclassRes, eventsRes, jobsRes] = await Promise.all([
          // Media content
          supabase.rpc('get_content_by_destination', { destination: 'media' }),
          // Masterclass content
          supabase.rpc('get_content_by_destination', { destination: 'masterclass' }),
          // Published events (matches getPublishedEvents filter)
          supabase
            .from('events')
            .select('*')
            .eq('is_visible_in_join_tab', true)
            .eq('is_published', true)
            .order('event_date', { ascending: true }),
          // Jobs
          supabase
            .from('projects_page_jobs')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false }),
        ]);

        const mediaContent = mediaRes.data || [];
        const masterclassContent = masterclassRes.data || [];
        const publishedEvents = eventsRes.data || [];
        const allJobs = jobsRes.data || [];

        // Prefetch all images in parallel to prevent jitter when displaying
        const imagesToPrefetch = [
          ...mediaContent.map((item: any) => item.thumbnail_url),
          ...masterclassContent.map((item: any) => item.thumbnail_url),
          ...publishedEvents.map((item: any) => item.image_url).filter(Boolean),
        ];

        const prefetchPromises = imagesToPrefetch.map(
          (url) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = url;
            })
        );

        // Wait for all images to load
        await Promise.all(prefetchPromises);

        // Store in localStorage/sessionStorage for instant access
        try {
          localStorage.setItem('media_content_thumbnails', JSON.stringify(mediaContent));
          localStorage.setItem('masterclass_content_thumbnails', JSON.stringify(masterclassContent));
          localStorage.setItem('preloaded_events', JSON.stringify(publishedEvents));
          localStorage.setItem('preloaded_jobs', JSON.stringify(allJobs));
        } catch (e) {
          console.warn('Failed to cache preloaded data:', e);
        }

        setData((prev) => ({
          ...prev,
          mediaContent,
          masterclassContent,
          publishedEvents,
          allJobs,
          isLoaded: true,
        }));
      } catch (err) {
        console.error('Error preloading public data:', err);
        // Still mark as loaded to unblock UI even if fetch failed
        setData((prev) => ({ ...prev, isLoaded: true }));
      }
    };

    preloadPublicData();
  }, []);

  // Preload user stats when user becomes available
  useEffect(() => {
    const preloadUserStats = async () => {
      try {
        const { data: authData } = await supabase.auth.getSession();
        const user = authData?.session?.user;

        if (!user) {
          // No user, clear cached stats
          try {
            localStorage.removeItem('cached_user_stats');
          } catch (e) {
            console.warn('Failed to clear user stats cache:', e);
          }
          return;
        }

        // Fetch user stats
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('portfolio_views, followers, rating, loyalty_points')
          .eq('id', user.id)
          .single();

        if (profileErr) throw profileErr;

        const userStats = {
          portfolio_views: profileData?.portfolio_views || 0,
          followers: profileData?.followers || 0,
          rating: profileData?.rating || 0,
          loyalty_points: profileData?.loyalty_points || 0,
        };

        // Cache user stats
        try {
          localStorage.setItem('cached_user_stats', JSON.stringify(userStats));
        } catch (e) {
          console.warn('Failed to cache user stats:', e);
        }

        setData((prev) => ({
          ...prev,
          userStats,
        }));
      } catch (err) {
        console.error('Error preloading user stats:', err);
      }
    };

    preloadUserStats();
  }, []);

  return (
    <DataPreloadContext.Provider value={data}>
      {children}
    </DataPreloadContext.Provider>
  );
}

export function usePreloadedData() {
  const context = useContext(DataPreloadContext);
  if (!context) {
    throw new Error('usePreloadedData must be used within DataPreloadProvider');
  }
  return context;
}
