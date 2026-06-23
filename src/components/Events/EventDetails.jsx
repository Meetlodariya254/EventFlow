import { useState } from 'react';
import Modal from 'react-modal';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  StickyNote,
  Bell,
  MessageCircle,
  PhoneCall,
  Pencil,
  Trash2,
  Tag,
} from 'lucide-react';
import {
  getEventStatus,
  formatDate,
  formatTime,
  formatRelativeTime,
  getCategoryConfig,
} from '../../utils/helpers';
import { REMINDER_STATUS } from '../../utils/constants';

// Bind modal to app root for accessibility
Modal.setAppElement('#root');

const statusBadgeMap = {
  upcoming: { label: 'Upcoming', bg: 'bg-white/20', text: 'text-white' },
  completed: { label: 'Completed', bg: 'bg-white', text: 'text-emerald-600' },
  overdue: { label: 'Overdue', bg: 'bg-white', text: 'text-red-600' },
};

const reminderStatusConfig = {
  [REMINDER_STATUS.PENDING]: { label: 'Pending', dot: 'bg-yellow-400', ringColor: 'ring-yellow-400/30' },
  [REMINDER_STATUS.SENT]: { label: 'Sent', dot: 'bg-blue-500', ringColor: 'ring-blue-500/30' },
  [REMINDER_STATUS.DELIVERED]: { label: 'Delivered', dot: 'bg-emerald-500', ringColor: 'ring-emerald-500/30' },
  [REMINDER_STATUS.FAILED]: { label: 'Failed', dot: 'bg-red-500', ringColor: 'ring-red-500/30' },
  [REMINDER_STATUS.CALLED]: { label: 'Called', dot: 'bg-emerald-500', ringColor: 'ring-emerald-500/30' },
};

const EventDetails = ({ isOpen, onClose, event, onEdit, onDelete, reminders }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!event) return null;

  const status = getEventStatus(event);
  const badge = statusBadgeMap[status] || statusBadgeMap.upcoming;
  const categoryConfig = getCategoryConfig(event.category);

  // Build event datetime for relative time
  const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
  const [hours, minutes] = (event.startTime || '00:00').split(':').map(Number);
  const eventDateTime = new Date(eventDate);
  eventDateTime.setHours(hours, minutes, 0, 0);

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

  const handleEdit = () => {
    onEdit?.(event);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      closeTimeoutMS={200}
      className="ReactModal__Content"
      overlayClassName="ReactModal__Overlay"
    >
      {/* ── HEADER ── */}
      <div className="relative p-6 gradient-primary text-white rounded-t-modal">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-heading font-bold pr-12 mb-3">
          {event.title}
        </h2>

        {/* Status badge + Category chip */}
        <div className="flex items-center flex-wrap gap-2">
          <span
            className={`${badge.bg} ${badge.text} text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider`}
          >
            {badge.label}
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 text-white/90">
            <Tag className="w-3 h-3" />
            {categoryConfig.label}
          </span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="p-6 space-y-6">
        {/* Date & Time section */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-surface-700 dark:text-surface-200">
            <Calendar className="w-5 h-5 text-primary-500 shrink-0" />
            <span className="text-base font-medium">{formatDate(event.date)}</span>
          </div>

          {event.startTime && (
            <div className="flex items-center gap-3 text-surface-700 dark:text-surface-200">
              <Clock className="w-5 h-5 text-primary-500 shrink-0" />
              <span className="text-base">
                {formatTime(event.startTime)}
                {event.endTime && ` – ${formatTime(event.endTime)}`}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="w-5" /> {/* spacer to align with icons */}
            <span className="text-sm font-medium text-primary-500 dark:text-primary-400">
              {formatRelativeTime(eventDateTime)}
            </span>
          </div>
        </div>

        {/* Person section */}
        {(event.personName || event.mobileNumber || event.email) && (
          <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-surface-800">
            {event.personName && (
              <div className="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                <User className="w-5 h-5 text-secondary-500 shrink-0" />
                <span className="text-lg font-medium">{event.personName}</span>
              </div>
            )}

            {event.mobileNumber && (() => {
              let cleanNumber = (event.mobileNumber || '').replace(/[^\d]/g, '');
              if (cleanNumber.length === 10) {
                cleanNumber = '91' + cleanNumber;
              }
              const messageText = `Hi ${event.personName || ''}, reminder: "${event.title}" is scheduled for ${event.startTime || ''} today. Don't miss it! 📅`;
              const encodedText = encodeURIComponent(messageText);
              const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;

              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-surface-700 dark:text-surface-200">
                    <Phone className="w-5 h-5 text-secondary-500 shrink-0" />
                    <a
                      href={`tel:${event.mobileNumber}`}
                      className="text-base text-primary-600 dark:text-primary-400 hover:underline transition-colors duration-200 font-medium"
                    >
                      {event.mobileNumber}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 pl-8">
                    <MessageCircle className="w-4.5 h-4.5 text-[#25D366] shrink-0" />
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#25D366] hover:underline transition-colors duration-200 font-semibold flex items-center gap-1"
                    >
                      Send WhatsApp Message
                    </a>
                  </div>
                </div>
              );
            })()}

            {event.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-secondary-500 shrink-0" />
                <a
                  href={`mailto:${event.email}`}
                  className="text-base text-primary-600 dark:text-primary-400 hover:underline transition-colors duration-200"
                >
                  {event.email}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Description section */}
        {event.description && (
          <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Description</span>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
              <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </div>
        )}

        {/* Notes section */}
        {event.notes && (
          <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-surface-800">
            <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
              <StickyNote className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Notes</span>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
              <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
                {event.notes}
              </p>
            </div>
          </div>
        )}

        {/* Reminder Timeline section */}
        <div className="space-y-3 pt-2 border-t border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-semibold uppercase tracking-wider">Reminder Status</span>
          </div>

          {reminders && reminders.length > 0 ? (
            <div className="relative ml-2 pl-6">
              {/* Vertical timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-surface-200 dark:bg-surface-700" />

              {/* Step 1: WhatsApp */}
              <div className="relative pb-6">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-6 top-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center
                    ring-4 ${
                      whatsappReminder
                        ? `${reminderStatusConfig[whatsappReminder.status]?.dot || 'bg-gray-400'} ${reminderStatusConfig[whatsappReminder.status]?.ringColor || 'ring-gray-400/30'}`
                        : 'bg-surface-300 dark:bg-surface-600 ring-surface-200 dark:ring-surface-700'
                    }`}
                />

                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                      WhatsApp Reminder
                    </p>
                    {whatsappReminder ? (
                      <>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                          Status:{' '}
                          <span className="font-medium">
                            {reminderStatusConfig[whatsappReminder.status]?.label || whatsappReminder.status}
                          </span>
                        </p>
                        {whatsappReminder.sentAt && (
                          <p className="text-xs text-surface-400 mt-0.5">
                            Sent at {formatTime(whatsappReminder.sentAt)} · {formatRelativeTime(whatsappReminder.sentAt)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-surface-400 mt-0.5">Not configured</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Voice Call */}
              <div className="relative">
                {/* Timeline dot */}
                <div
                  className={`absolute -left-6 top-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center
                    ring-4 ${
                      voiceReminder
                        ? `${reminderStatusConfig[voiceReminder.status]?.dot || 'bg-gray-400'} ${reminderStatusConfig[voiceReminder.status]?.ringColor || 'ring-gray-400/30'}`
                        : 'bg-surface-300 dark:bg-surface-600 ring-surface-200 dark:ring-surface-700'
                    }`}
                />

                <div className="flex items-start gap-3">
                  <PhoneCall className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
                      Voice Call Reminder
                    </p>
                    {voiceReminder ? (
                      <>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                          Status:{' '}
                          <span className="font-medium">
                            {reminderStatusConfig[voiceReminder.status]?.label || voiceReminder.status}
                          </span>
                        </p>
                        {voiceReminder.sentAt && (
                          <p className="text-xs text-surface-400 mt-0.5">
                            Called at {formatTime(voiceReminder.sentAt)} · {formatRelativeTime(voiceReminder.sentAt)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-surface-400 mt-0.5">Not configured</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-surface-400 dark:text-surface-500 italic pl-6">
              No reminders scheduled yet
            </p>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="p-6 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between">
        {/* Delete button with inline confirmation */}
        {!showDeleteConfirm ? (
          <button
            onClick={handleDeleteClick}
            className="btn-danger text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm text-red-600 dark:text-red-400 font-medium mr-1">
              Confirm?
            </span>
            <button
              onClick={handleConfirmDelete}
              className="btn-danger text-sm px-3 py-1.5 min-h-[40px]"
            >
              Yes, delete
            </button>
            <button
              onClick={handleCancelDelete}
              className="btn-secondary text-sm px-3 py-1.5 min-h-[40px]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Edit button */}
        <button
          onClick={handleEdit}
          className="btn-primary text-sm"
        >
          <Pencil className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>
    </Modal>
  );
};

export default EventDetails;
