import { supabase } from '../lib/supabase';

// Track views using database function (bypasses RLS)
export const trackVideoView = async (contentId: string) => {
  if (!contentId) return;

  try {
    const { data, error } = await supabase.rpc('increment_view_count', {
      content_id: contentId
    });

    if (error) {
      console.error('Error tracking view:', error);
      return;
    }

    if (data && data[0]) {
      console.log(`View tracked. New count: ${data[0].new_views_count}`);
    }
  } catch (err) {
    console.error('Failed to track view:', err);
  }
};

// Track masterclass views
export const trackMasterclassView = async (contentId: string) => {
  if (!contentId) return;

  try {
    const { data, error } = await supabase.rpc('increment_masterclass_view_count', {
      content_id: contentId
    });

    if (error) {
      console.error('Error tracking masterclass view:', error);
      return;
    }

    if (data && data[0]) {
      console.log(`Masterclass view tracked. New count: ${data[0].new_views_count}`);
    }
  } catch (err) {
    console.error('Failed to track masterclass view:', err);
  }
};

// Hook version for backward compatibility
export const useSimpleVideoViewTracking = (contentId: string) => {
  const trackView = () => trackVideoView(contentId);
  return { trackView };
};
