import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Calendar, Loader } from 'lucide-react';
import EventCard from './EventCard';
import EditEventModal from './EditEventModal';
import ReminderModal from './ReminderModal';
import { ToastContainer } from './Toast';
import { getPublishedEvents, addEventToCalendar, removeEventFromCalendar, getUserCalendarEvents, createEventReminders } from '../lib/eventServices';
import { filterJoinTabEvents } from '../lib/eventUtils';
import type { Event as DBEvent } from '../types/events';
import { useAuth } from '../context/AuthContext';
import { usePreloadedData } from '../context/DataPreloadContext';
import { useToast } from '../hooks/useToast';

interface JoinTabProps {
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
}

export default function JoinTab({
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
}: JoinTabProps) {
  const { user } = useAuth();
  const preloadedData = usePreloadedData();
  const { toasts, removeToast, success, error: showError, info } = useToast();
  const [nowTime, setNowTime] = useState(Date.now());
  const [calendarAdded, setCalendarAdded] = useState<Record<string, boolean>>({});

  // Initialize with preloaded data for instant display (zero delay)
  const [publishedEvents, setPublishedEvents] = useState<DBEvent[]>(preloadedData.publishedEvents);

  const [calendarEvents, setCalendarEvents] = useState<DBEvent[]>([]);
  const [editingEvent, setEditingEvent] = useState<DBEvent | null>(null);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState<Record<string, boolean>>({});
  const [reminderModalEvent, setReminderModalEvent] = useState<DBEvent | null>(null);
  const [isSettingReminder, setIsSettingReminder] = useState(false);

  const categories = ['all', 'social', 'networking', 'business', 'workshop', 'conference', 'calendar'];

  useEffect(() => {
    const t = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Load calendar events in background if user is logged in
    if (user) {
      const loadCalendarEvents = async () => {
        try {
          const events = await getUserCalendarEvents(user.id);
          const calendarAddedMap: Record<string, boolean> = {};
          events.forEach(event => {
            calendarAddedMap[event.id] = true;
          });
          setCalendarEvents(events);
          setCalendarAdded(calendarAddedMap);
        } catch (err) {
          console.error('Error loading calendar events:', err);
        }
      };
      loadCalendarEvents();
    }
  }, [user]);

  useEffect(() => {
    // Refresh published events in background
    const refreshEvents = async () => {
      try {
        const events = await getPublishedEvents();
        setPublishedEvents(events);
        try {
          localStorage.setItem('join_tab_published_events', JSON.stringify(events));
        } catch (e) {
          // localStorage might be full, ignore
        }
      } catch (err) {
        console.error('Error refreshing events:', err);
      }
    };
    refreshEvents();
  }, []);

  const loadPublishedEvents = async () => {
    try {
      const events = await getPublishedEvents();
      setPublishedEvents(events);
      // Update cache
      try {
        localStorage.setItem('join_tab_published_events', JSON.stringify(events));
      } catch (e) {
        // localStorage might be full, ignore
      }
    } catch (err) {
      console.error('Error loading published events:', err);
    }
  };

  const loadUserCalendarEvents = async () => {
    if (!user) return;
    try {
      const events = await getUserCalendarEvents(user.id);
      const newCalendarAdded: Record<string, boolean> = {};
      events.forEach(event => {
        newCalendarAdded[event.id] = true;
      });
      setCalendarEvents(events);
      setCalendarAdded(prev => ({ ...prev, ...newCalendarAdded }));
    } catch (err) {
      console.error('Error loading calendar events:', err);
    }
  };

  // Filter events to only show those visible in Join tab (not past 1 hour after event time)
  const visibleEvents = filterJoinTabEvents(publishedEvents);

  const filteredEvents = (() => {
    // If calendar filter is selected, show only calendar events
    if (selectedCategory === 'calendar') {
      if (!user) {
        return [];
      }
      return calendarEvents.filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (event.organizer_specification || event.organizer_name).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    }

    // Otherwise show published events filtered by category
    return visibleEvents.filter((event) => {
      const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.organizer_specification || event.organizer_name).toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch && event.status === 'upcoming';
    });
  })();

  const toggleCalendar = async (eventId: string) => {
    if (!user) {
      showError('Please sign in to add events to calendar');
      return;
    }

    const isAdded = !!calendarAdded[eventId];

    if (!isAdded) {
      // Add to calendar
      setIsAddingToCalendar(prev => ({ ...prev, [eventId]: true }));
      const result = await addEventToCalendar(user.id, eventId, false);

      if (result.success) {
        setCalendarAdded(prev => ({ ...prev, [eventId]: true }));
        success('Added to calendar', 3000);

        // Find the event and show reminder modal
        const event = publishedEvents.find(e => e.id === eventId);
        if (event) {
          setReminderModalEvent(event);
        }
      } else {
        showError(result.error || 'Failed to add event to calendar');
      }
      setIsAddingToCalendar(prev => ({ ...prev, [eventId]: false }));
    } else {
      // Remove from calendar
      setIsAddingToCalendar(prev => ({ ...prev, [eventId]: true }));
      const result = await removeEventFromCalendar(user.id, eventId);

      if (result.success) {
        setCalendarAdded(prev => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        success('Removed from calendar', 3000);

        // Reload calendar events to update the list if on calendar view
        if (selectedCategory === 'calendar') {
          loadUserCalendarEvents();
        }
      } else {
        showError(result.error || 'Failed to remove event from calendar');
      }
      setIsAddingToCalendar(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleReminderConfirm = async (
    reminderType: 'in_app' | 'email' | 'push' | 'all',
    reminderBefore: '15m' | '1h' | '24h' | 'week'
  ) => {
    if (!user || !reminderModalEvent) return;

    setIsSettingReminder(true);
    try {
      const result = await createEventReminders(
        user.id,
        reminderModalEvent.id,
        reminderModalEvent,
        reminderType,
        reminderBefore
      );

      if (result.success) {
        success(`Reminders set for ${reminderBefore}`, 3000);
        setReminderModalEvent(null);
      } else {
        showError(result.error || 'Failed to set reminders');
      }
    } finally {
      setIsSettingReminder(false);
    }
  };

  const handleShare = (event: DBEvent) => {
    const shareData = {
      title: event.title,
      text: event.description || '',
      url: window.location.href + '#event-' + event.id,
    };
    if ((navigator as any).share) {
      (navigator as any).share(shareData).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareData.url).then(() => alert('Event link copied to clipboard'));
    }
  };

  const handleRegister = (eventId: string) => {
    if (!user) {
      alert('Please sign in to book this event.');
      return;
    }
    alert('Booking functionality will be implemented soon. You can contact the organizer to register.');
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 glass-effect rounded-xl border border-white/20 text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center space-x-4">
          <Filter className="text-gray-400 w-5 h-5" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`px-4 py-3 glass-effect rounded-xl border border-white/20 focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all ${
              selectedCategory === 'calendar' ? 'text-red-400' : 'text-white'
            }`}
          >
            {categories.map((category) => (
              <option
                key={category}
                value={category}
                className={category === 'calendar' ? 'bg-red-900 text-red-400' : 'bg-gray-800 text-white'}
              >
                {category === 'calendar' ? '📅 Calendar' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              nowTime={nowTime}
              calendarAdded={calendarAdded}
              onToggleCalendar={toggleCalendar}
              onShare={() => handleShare(event)}
              onRegister={() => handleRegister(event.id)}
              onEventUpdated={loadPublishedEvents}
              onEdit={() => setEditingEvent(event)}
            />
          ))}
        </div>
      ) : preloadedData.isLoaded ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {selectedCategory === 'calendar'
              ? user
                ? 'No events in your calendar'
                : 'Sign in to view your calendar'
              : 'No events found'}
          </h3>
          <p className="text-gray-400">
            {selectedCategory === 'calendar'
              ? user
                ? 'Add events to your calendar by clicking the calendar icon on events you like.'
                : 'Sign in to save events to your personal calendar.'
              : 'Try adjusting your search criteria or check back later for new events.'}
          </p>
        </div>
      ) : null}

      {editingEvent && user && (
        <EditEventModal
          event={editingEvent}
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          onEventUpdated={loadPublishedEvents}
          userId={user.id}
        />
      )}

      {reminderModalEvent && (
        <ReminderModal
          event={reminderModalEvent}
          isOpen={!!reminderModalEvent}
          onClose={() => setReminderModalEvent(null)}
          onConfirm={handleReminderConfirm}
          isLoading={isSettingReminder}
        />
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
