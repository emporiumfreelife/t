import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Activity {
  id: string;
  action_type: 'update' | 'follower' | 'approval' | 'other';
  action: string;
  created_at: string;
}

function getCacheKey(userId: string | undefined): string {
  return `activities_${userId || 'anonymous'}`;
}

export function useUserActivity(limit: number = 10) {
  const { user } = useAuth();
  // Initialize with cached data if available, otherwise empty array
  const [activities, setActivities] = useState<Activity[]>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      try {
        const cached = localStorage.getItem(getCacheKey(user.id));
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('Failed to load activities from cache:', error);
      }
    }
    return [];
  });
  // Never show loading state - always display data from cache or fresh fetch
  const [loading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setActivities([]);
      return;
    }

    // Fetch fresh data in background
    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        const formattedActivities = (data || []).map((item: any) => ({
          id: item.id,
          action_type: item.action_type || 'other',
          action: item.action || 'Activity',
          created_at: item.created_at,
        }));

        setActivities(formattedActivities);
        // Cache the fresh data
        try {
          localStorage.setItem(getCacheKey(user.id), JSON.stringify(formattedActivities));
        } catch (e) {
          console.error('Failed to cache activities:', e);
        }
      } catch (err) {
        console.error('Error fetching activities:', err);
      }
    };

    fetchActivities();

    // Subscribe to real-time updates for instant UI refresh
    const subscription = supabase
      .channel(`public:user_activities:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const newActivity: Activity = {
              id: payload.new.id,
              action_type: payload.new.action_type || 'other',
              action: payload.new.action || 'Activity',
              created_at: payload.new.created_at,
            };
            setActivities((prev) => {
              const updated = [newActivity, ...prev].slice(0, limit);
              // Update cache with new data
              try {
                localStorage.setItem(getCacheKey(user.id), JSON.stringify(updated));
              } catch (e) {
                console.error('Failed to cache activities:', e);
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, limit]);

  return { activities, loading };
}
