import { useState, useEffect } from 'react';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import EventForm from '../Events/EventForm';
import EventDetails from '../Events/EventDetails';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToEvents, createEvent, updateEvent, deleteEvent, toFirestoreTimestamp } from '../../firebase/firestore';
import { getEventsForDate, formatDate, formatTime, getCategoryConfig } from '../../utils/helpers';
import { CalendarDays, CalendarCheck, Plus, Clock, User } from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingSpinner from '../UI/LoadingSpinner';

export default function Calendar() {
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  /* ── Subscribe to events ── */
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToEvents(user.uid, (data) => {
      setEvents(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  /* ── Derived data ── */
  const selectedDateEvents = getEventsForDate(events, selectedDate);

  /* ── Handlers ── */
  const handleGoToToday = () => setSelectedDate(new Date());

  const handleOpenEventForm = () => setShowEventForm(true);

  const handleOpenEventDetails = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleSaveEvent = async (eventData) => {
    try {
      const dateObj = new Date(eventData.date);
      if (selectedEvent) {
        await updateEvent(selectedEvent.id, {
          ...eventData,
          date: toFirestoreTimestamp(dateObj),
        });
        toast.success('Event updated!');
      } else {
        await createEvent({
          ...eventData,
          date: toFirestoreTimestamp(dateObj),
          userId: user.uid,
        });
        toast.success('Event created!');
      }
      setShowEventForm(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to save event:', err);
      toast.error('Failed to save event.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId);
      toast.success('Event deleted!');
      setShowEventDetails(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
      toast.error('Failed to delete event.');
    }
  };

  /* ── Tile content (dots) ── */
  const renderTileContent = ({ date, view }) => {
    if (view !== 'month') return null;

    const dayEvents = getEventsForDate(events, date);
    if (!dayEvents.length) return null;

    const maxDots = 3;
    const visible = dayEvents.slice(0, maxDots);
    const overflow = dayEvents.length - maxDots;

    return (
      <div className="event-dots-container flex items-center justify-center gap-[3px] mt-0.5 flex-wrap">
        {visible.map((evt, i) => {
          const dotColor = getCategoryConfig(evt.category)?.dotColor || 'bg-indigo-500';
          return (
            <span
              key={i}
              className={`event-dot inline-block w-1.5 h-1.5 rounded-full ${dotColor}`}
            />
          );
        })}
        {overflow > 0 && (
          <span className="text-[8px] leading-none font-semibold text-indigo-400 dark:text-indigo-300">
            +{overflow}
          </span>
        )}
      </div>
    );
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 relative overflow-hidden">
      {/* ── Gradient-mesh decorations ── */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-400/20 dark:bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-pink-400/20 dark:bg-pink-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-300/10 dark:bg-amber-500/5 blur-3xl" />

      {/* ── Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="flex items-center gap-3 mb-8 animate-[fadeInDown_0.5s_ease-out]">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 animate-[fadeInUp_0.6s_ease-out]">
          {/* ── Calendar section (60 %) ── */}
          <div className="lg:col-span-3">
            <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 p-4 md:p-6 transition-all duration-300">
              <ReactCalendar
                value={selectedDate}
                onChange={setSelectedDate}
                tileContent={renderTileContent}
                className="!w-full !border-none !bg-transparent font-body calendar-custom"
              />

              {/* Today button */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleGoToToday}
                  className="btn-secondary inline-flex items-center gap-2 px-5 py-3 rounded-xl font-heading font-semibold text-sm
                             bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700
                             text-white shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/30
                             active:scale-[0.97] transition-all duration-200 min-h-[48px]"
                >
                  <CalendarCheck className="w-5 h-5" />
                  Today
                </button>
              </div>
            </div>
          </div>

          {/* ── Selected-date events panel (40 %) ── */}
          <div className="lg:col-span-2">
            <div className="backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 p-4 md:p-6 transition-all duration-300">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-heading font-bold text-lg text-gray-900 dark:text-white">
                    {formatDate(selectedDate)}
                  </h2>
                </div>
                <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {selectedDateEvents.length}
                </span>
              </div>

              {/* Event list or empty state */}
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                  {selectedDateEvents.map((event) => {
                    const config = getCategoryConfig(event.category);
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleOpenEventDetails(event)}
                        className={`w-full text-left rounded-xl p-3.5 border-l-4 ${config?.borderColor || 'border-indigo-500'}
                                   bg-white/70 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700/80
                                   shadow-sm hover:shadow-md transition-all duration-200 group min-h-[48px]`}
                      >
                        <p className="font-heading font-semibold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          {event.time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatTime(event.time)}
                            </span>
                          )}
                          {event.personName && (
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {event.personName}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                    <CalendarDays className="w-7 h-7 text-indigo-400 dark:text-indigo-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-body mb-4">
                    No events on this date
                  </p>
                  <button
                    onClick={handleOpenEventForm}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold
                               text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                               transition-colors duration-200 min-h-[48px]"
                  >
                    <Plus className="w-4 h-4" />
                    Add one
                  </button>
                </div>
              )}

              {/* Add Event button */}
              <div className="mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                <button
                  onClick={handleOpenEventForm}
                  className="btn-primary w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-heading font-semibold text-sm
                             bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700
                             text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30
                             active:scale-[0.97] transition-all duration-200 min-h-[48px]"
                >
                  <Plus className="w-5 h-5" />
                  Add Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showEventForm && (
        <EventForm
          isOpen={showEventForm}
          initialData={selectedEvent}
          selectedDate={selectedDate}
          onSave={handleSaveEvent}
          onClose={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {showEventDetails && selectedEvent && (
        <EventDetails
          isOpen={showEventDetails}
          event={selectedEvent}
          onClose={() => {
            setShowEventDetails(false);
            setSelectedEvent(null);
          }}
          onEdit={(event) => {
            setShowEventDetails(false);
            setSelectedEvent(event);
            setShowEventForm(true);
          }}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}
