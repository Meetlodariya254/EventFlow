import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  subscribeToUserReminders,
  toFirestoreTimestamp,
} from '../../firebase/firestore';
import { getEventStats, filterEvents, sortEvents } from '../../utils/helpers';
import { EVENT_CATEGORIES } from '../../utils/constants';
import EventCard from './EventCard';
import EventForm from '../Events/EventForm';
import EventDetails from '../Events/EventDetails';
import EmptyState from '../UI/EmptyState';
import SkeletonLoader from '../UI/SkeletonLoader';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'react-toastify';

/* ───── stat card config ───── */
const statCards = [
  {
    key: 'total',
    label: 'Total Events',
    icon: CalendarDays,
    iconBg: 'bg-primary-100 dark:bg-primary-900/40',
    iconColor: 'text-primary-500',
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
    icon: Clock,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-500',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-500',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-500',
  },
];

/* ───── status filter chips ───── */
const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

/* ───── sort options ───── */
const sortOptions = [
  { value: 'date', label: 'Date ↑' },
  { value: 'date-desc', label: 'Date ↓' },
  { value: 'title', label: 'Title' },
  { value: 'person', label: 'Person' },
];

const Dashboard = () => {
  const { user } = useAuth();

  /* ── data state ── */
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState({});

  /* ── filter / search state ── */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  /* ── modal state ── */
  const [showEventForm, setShowEventForm] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  /* ════════════════ Firestore subscriptions ════════════════ */
  useEffect(() => {
    if (!user) return;

    const unsubEvents = subscribeToEvents(user.uid, (data) => {
      setEvents(data);
      setLoading(false);
    });

    const unsubReminders = subscribeToUserReminders(user.uid, (data) => {
      // Group reminders by eventId
      const grouped = {};
      data.forEach((r) => {
        if (!grouped[r.eventId]) grouped[r.eventId] = [];
        grouped[r.eventId].push(r);
      });
      setReminders(grouped);
    });

    return () => {
      unsubEvents();
      unsubReminders();
    };
  }, [user]);

  /* ════════════════ Derived data ════════════════ */
  const stats = useMemo(() => getEventStats(events), [events]);

  const processedEvents = useMemo(() => {
    const filtered = filterEvents(events, {
      search,
      status: statusFilter,
      category: categoryFilter,
    });
    return sortEvents(filtered, sortBy);
  }, [events, search, statusFilter, categoryFilter, sortBy]);

  /* ════════════════ Handlers ════════════════ */
  const handleCreateEvent = async (formData) => {
    try {
      const eventData = {
        ...formData,
        date: toFirestoreTimestamp(new Date(formData.date)),
      };
      await createEvent(user.uid, eventData);
      toast.success('Event created successfully!');
      setShowEventForm(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Create event error:', error);
      toast.error('Failed to create event. Please try again.');
      throw error; // re-throw so EventForm can handle loading state
    }
  };

  const handleUpdateEvent = async (formData) => {
    try {
      const eventData = {
        ...formData,
        date: toFirestoreTimestamp(new Date(formData.date)),
      };
      await updateEvent(selectedEvent.id, eventData);
      toast.success('Event updated successfully!');
      setShowEventForm(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Update event error:', error);
      toast.error('Failed to update event. Please try again.');
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteEvent(eventId);
      toast.success('Event deleted successfully!');
    } catch (error) {
      console.error('Delete event error:', error);
      toast.error('Failed to delete event. Please try again.');
    }
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setShowEventForm(true);
  };

  const handleViewDetails = (event) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const openCreateForm = () => {
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  /* ════════════════ Render ════════════════ */
  return (
    <div className="min-h-screen gradient-mesh px-4 md:px-6 lg:px-8 py-6">
      {/* ─────────────── 1. Stats Cards ─────────────── */}
      <section className="mb-8">
        {loading ? (
          <SkeletonLoader type="stats" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className={`glass-card p-5 animate-fade-in-up animate-stagger-${idx + 1}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${card.iconBg}`}
                    >
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-heading font-bold text-surface-900 dark:text-white">
                    {stats[card.key]}
                  </p>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                    {card.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─────────────── 2. Controls Row ─────────────── */}
      <section className="mb-6 flex flex-wrap items-center gap-4 justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Right‑side controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter chips */}
          <div className="flex items-center gap-1.5">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 min-h-[36px]
                  ${
                    statusFilter === f.value
                      ? 'bg-primary-500 text-white shadow-glow-primary'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field text-sm py-2 pr-8 min-h-[36px] appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {EVENT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field text-sm py-2 min-h-[36px] appearance-none cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* New Event button */}
          <button onClick={openCreateForm} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Event</span>
          </button>
        </div>
      </section>

      {/* ─────────────── 3. Events Grid ─────────────── */}
      <section>
        {loading ? (
          <SkeletonLoader type="card" count={6} />
        ) : events.length === 0 ? (
          <EmptyState onCreateEvent={openCreateForm} />
        ) : processedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
            <Search className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-4" />
            <p className="text-lg font-heading font-semibold text-surface-600 dark:text-surface-400 mb-1">
              No events match your filters
            </p>
            <p className="text-sm text-surface-400 dark:text-surface-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                reminders={reminders[event.id]}
                onEdit={handleEdit}
                onDelete={handleDeleteEvent}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─────────────── 4. Modals ─────────────── */}
      {/* Create / Edit modal */}
      <EventForm
        isOpen={showEventForm}
        onClose={() => {
          setShowEventForm(false);
          setSelectedEvent(null);
        }}
        onSave={selectedEvent ? handleUpdateEvent : handleCreateEvent}
        initialData={selectedEvent}
      />

      {/* View details modal */}
      {showEventDetails && selectedEvent && (
        <EventDetails
          isOpen={showEventDetails}
          event={selectedEvent}
          reminders={reminders[selectedEvent.id]}
          onClose={() => {
            setShowEventDetails(false);
            setSelectedEvent(null);
          }}
          onEdit={() => {
            setShowEventDetails(false);
            setShowEventForm(true);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
