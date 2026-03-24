import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  attendees_count: number;
  location: string;
  organizer_name: string;
}

function getCacheKey(): string {
  return 'upcomingEvents';
}

export function useUpcomingEvents(limit: number = 3) {
  const { user } = useAuth();
  // Initialize with cached data if available, otherwise empty array
  const [events, setEvents] = useState<UpcomingEvent[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(getCacheKey());
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('Failed to load events from cache:', error);
      }
    }
    return [];
  });
  // Never show loading state - always display data from cache or fresh fetch
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setEvents([]);
      return;
    }

    // Fetch fresh data in background
    const fetchEvents = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error: err } = await supabase
          .from('events')
          .select('id, title, event_date, event_time, attendees_count, location, organizer_name')
          .eq('status', 'upcoming')
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(limit);

        if (err) throw err;

        const eventData = data || [];
        setEvents(eventData);
        // Cache the fresh data
        try {
          localStorage.setItem(getCacheKey(), JSON.stringify(eventData));
        } catch (e) {
          console.error('Failed to cache events:', e);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchEvents();

    // Subscribe to real-time updates for instant UI refresh
    const subscription = supabase
      .channel('public:events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `status=eq.upcoming`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, limit]);

  return { events, loading, error };
}
