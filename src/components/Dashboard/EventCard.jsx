import { useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Eye,
  Pencil,
  Trash2,
  MessageCircle,
  Tag,
} from 'lucide-react';
import {
  getEventStatus,
  formatDate,
  formatTime,
  getCategoryConfig,
  formatRelativeTime,
} from '../../utils/helpers';
import { REMINDER_STATUS } from '../../utils/constants';

const statusBadgeMap = {
  upcoming: { label: 'Upcoming', className: 'badge-upcoming' },
  completed: { label: 'Completed', className: 'badge-completed' },
  overdue: { label: 'Overdue', className: 'badge-overdue' },
};

const categoryBorderMap = {
  work: 'category-work',
  personal: 'category-personal',
  birthday: 'category-birthday',
  meeting: 'category-meeting',
  other: 'category-other',
};

const reminderStatusConfig = {
  [REMINDER_STATUS.PENDING]: { label: 'Pending', dot: 'bg-yellow-400' },
  [REMINDER_STATUS.SENT]: { label: 'Sent', dot: 'bg-green-500' },
  [REMINDER_STATUS.DELIVERED]: { label: 'Delivered', dot: 'bg-green-500' },
  [REMINDER_STATUS.FAILED]: { label: 'Failed', dot: 'bg-red-500' },
  [REMINDER_STATUS.CALLED]: { label: 'Called', dot: 'bg-green-500' },
};

const EventCard = ({ event, onEdit, onDelete, onViewDetails, reminders }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = getEventStatus(event);
  const badge = statusBadgeMap[status] || statusBadgeMap.upcoming;
  const categoryConfig = getCategoryConfig(event.category);
  const borderClass = categoryBorderMap[event.category] || categoryBorderMap.other;

  const whatsappReminder = reminders?.find((r) => r.type === 'whatsapp');
  const voiceReminder = reminders?.find((r) => r.type === 'voice');

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(event.id);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className={`glass-card-hover ${borderClass} p-5 animate-fade-in-up relative overflow-hidden`}
    >
      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm dark:bg-surface-900/80 rounded-xl">
          <p className="font-heading font-semibold text-surface-800 dark:text-surface-100 text-base">
            Delete this event?
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirmDelete}
              className="btn-danger text-sm px-4 py-2 min-h-[36px]"
            >
              Confirm
            </button>
            <button
              onClick={handleCancelDelete}
              className="btn-secondary text-sm px-4 py-2 min-h-[36px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 1 ─ Header row: Title + Status badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-heading font-semibold text-lg truncate text-surface-900 dark:text-white">
          {event.title}
        </h3>
        <span
          className={`${badge.className} shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full`}
        >
          {badge.label}
        </span>
      </div>

      {/* 2 ─ Date / Time row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-500 dark:text-surface-400 mb-2">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {formatDate(event.date)}
        </span>

        {event.startTime && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatTime(event.startTime)}
            {event.endTime && ` - ${formatTime(event.endTime)}`}
          </span>
        )}
      </div>

      {/* 3 ─ Person row */}
      {(event.personName || event.mobileNumber) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-surface-600 dark:text-surface-300 mb-3">
          {event.personName && (
            <span className="inline-flex items-center gap-1.5">
              <User className="w-4 h-4 text-surface-400" />
              {event.personName}
            </span>
          )}
          {event.mobileNumber && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-surface-400" />
              {event.mobileNumber}
            </span>
          )}
        </div>
      )}

      {/* 4 ─ Category chip */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
            bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300`}
        >
          <Tag className="w-3 h-3" />
          {categoryConfig.label}
        </span>
      </div>

      {/* 5 ─ Reminder status */}
      {reminders && reminders.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3 text-sm text-surface-600 dark:text-surface-300">
          {whatsappReminder && (
            <div className="inline-flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-500" />
              <span
                className={`w-2 h-2 rounded-full ${
                  reminderStatusConfig[whatsappReminder.status]?.dot || 'bg-gray-400'
                }`}
              />
              <span>
                WhatsApp:{' '}
                {reminderStatusConfig[whatsappReminder.status]?.label || whatsappReminder.status}
              </span>
              {whatsappReminder.sentAt && (
                <span className="text-xs text-surface-400 ml-1">
                  {formatRelativeTime(whatsappReminder.sentAt)}
                </span>
              )}
            </div>
          )}

          {voiceReminder && (
            <div className="inline-flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-500" />
              <span
                className={`w-2 h-2 rounded-full ${
                  reminderStatusConfig[voiceReminder.status]?.dot || 'bg-gray-400'
                }`}
              />
              <span>
                Voice:{' '}
                {reminderStatusConfig[voiceReminder.status]?.label || voiceReminder.status}
              </span>
              {voiceReminder.sentAt && (
                <span className="text-xs text-surface-400 ml-1">
                  {formatRelativeTime(voiceReminder.sentAt)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 6 ─ Action buttons */}
      <div className="flex items-center gap-1 border-t border-surface-100 dark:border-surface-700 pt-3 mt-3">
        <button
          onClick={() => onViewDetails?.(event)}
          className="btn-ghost inline-flex items-center gap-1.5 text-sm min-h-[48px] min-w-[48px] px-3 py-2 rounded-lg"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">View</span>
        </button>

        <button
          onClick={() => onEdit?.(event)}
          className="btn-ghost inline-flex items-center gap-1.5 text-sm min-h-[48px] min-w-[48px] px-3 py-2 rounded-lg"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
          <span className="hidden sm:inline">Edit</span>
        </button>

        <button
          onClick={handleDeleteClick}
          className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5 text-sm min-h-[48px] min-w-[48px] px-3 py-2 rounded-lg ml-auto"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
};

export default EventCard;
