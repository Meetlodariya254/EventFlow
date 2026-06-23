import { EVENT_STATUS, EVENT_CATEGORIES } from './constants';

/**
 * Get the status of an event based on its date and time
 */
export const getEventStatus = (event) => {
  const now = new Date();
  const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
  
  // Build full event datetime from date + startTime
  const [hours, minutes] = (event.startTime || '00:00').split(':').map(Number);
  const eventDateTime = new Date(eventDate);
  eventDateTime.setHours(hours, minutes, 0, 0);

  // If event has an end time, use that for completion check
  if (event.endTime) {
    const [endH, endM] = event.endTime.split(':').map(Number);
    const endDateTime = new Date(eventDate);
    endDateTime.setHours(endH, endM, 0, 0);
    
    if (now > endDateTime) return EVENT_STATUS.COMPLETED;
  } else if (now > eventDateTime) {
    // No end time: if start time has passed by more than 1 hour, it's completed
    const oneHourAfter = new Date(eventDateTime.getTime() + 60 * 60 * 1000);
    if (now > oneHourAfter) return EVENT_STATUS.COMPLETED;
    return EVENT_STATUS.OVERDUE;
  }

  // If event date is in the past (different day)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const eventDayStart = new Date(eventDate);
  eventDayStart.setHours(0, 0, 0, 0);

  if (eventDayStart < todayStart) return EVENT_STATUS.COMPLETED;

  return EVENT_STATUS.UPCOMING;
};

/**
 * Format a date for display
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date as YYYY-MM-DD for input fields
 */
export const formatDateInput = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Format time for display (12-hour format)
 */
export const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Format a relative time string (e.g., "in 2 hours", "3 days ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = d - now;
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return 'just now';
  if (diffMins > 0 && diffMins < 60) return `in ${diffMins} min`;
  if (diffMins < 0 && diffMins > -60) return `${Math.abs(diffMins)} min ago`;
  if (diffHours > 0 && diffHours < 24) return `in ${diffHours} hr`;
  if (diffHours < 0 && diffHours > -24) return `${Math.abs(diffHours)} hr ago`;
  if (diffDays > 0 && diffDays < 30) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 0 && diffDays > -30) return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;

  return formatDate(d);
};

/**
 * Get the category config for an event
 */
export const getCategoryConfig = (categoryValue) => {
  return EVENT_CATEGORIES.find((c) => c.value === categoryValue) || EVENT_CATEGORIES[4]; // default to 'other'
};

/**
 * Validate a mobile number (basic international format)
 */
export const validateMobileNumber = (number) => {
  const cleaned = number.replace(/[\s\-()]/g, '');
  return /^\+?\d{10,15}$/.test(cleaned);
};

/**
 * Validate an email address
 */
export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Get events for a specific date
 */
export const getEventsForDate = (events, date) => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return events.filter((event) => {
    const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
    const eventDay = new Date(eventDate);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay.getTime() === targetDate.getTime();
  });
};

/**
 * Get statistics from events list
 */
export const getEventStats = (events) => {
  const stats = {
    total: events.length,
    upcoming: 0,
    completed: 0,
    overdue: 0,
  };

  events.forEach((event) => {
    const status = getEventStatus(event);
    if (status === EVENT_STATUS.UPCOMING) stats.upcoming++;
    else if (status === EVENT_STATUS.COMPLETED) stats.completed++;
    else if (status === EVENT_STATUS.OVERDUE) stats.overdue++;
  });

  return stats;
};

/**
 * Search/filter events
 */
export const filterEvents = (events, { search = '', status = 'all', category = 'all' }) => {
  return events.filter((event) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        event.title?.toLowerCase().includes(searchLower) ||
        event.personName?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (status !== 'all') {
      const eventStatus = getEventStatus(event);
      if (eventStatus !== status) return false;
    }

    // Category filter
    if (category !== 'all') {
      if (event.category !== category) return false;
    }

    return true;
  });
};

/**
 * Sort events by different criteria
 */
export const sortEvents = (events, sortBy = 'date') => {
  return [...events].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.date) - new Date(b.date);
      case 'date-desc':
        return new Date(b.date) - new Date(a.date);
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'person':
        return (a.personName || '').localeCompare(b.personName || '');
      default:
        return 0;
    }
  });
};

/**
 * Generate initials from a name
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
