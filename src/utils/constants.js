// Event categories with labels and colors
export const EVENT_CATEGORIES = [
  { value: 'work', label: 'Work', color: 'primary', dotColor: 'bg-primary-500' },
  { value: 'personal', label: 'Personal', color: 'secondary', dotColor: 'bg-secondary-500' },
  { value: 'birthday', label: 'Birthday', color: 'accent', dotColor: 'bg-accent-500' },
  { value: 'meeting', label: 'Meeting', color: 'emerald', dotColor: 'bg-emerald-500' },
  { value: 'other', label: 'Other', color: 'surface', dotColor: 'bg-surface-400' },
];

// Event status types
export const EVENT_STATUS = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
};

// Reminder status types
export const REMINDER_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CALLED: 'called',
};

// Navigation items
export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/calendar', label: 'Calendar', icon: 'CalendarDays' },
];

// Toast configuration
export const TOAST_CONFIG = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  newestOnTop: true,
  closeOnClick: true,
  rtl: false,
  pauseOnFocusLoss: true,
  draggable: true,
  pauseOnHover: true,
  theme: 'colored',
};

// App metadata
export const APP_NAME = 'EventFlow';
export const APP_DESCRIPTION = 'Smart event management with automated reminders';
