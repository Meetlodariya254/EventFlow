import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToUserReminders } from '../../firebase/firestore';
import { acknowledgeReminder } from '../../firebase/firestore';
import { Bell, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ActiveReminderBanner() {
  const { user } = useAuth();
  const [pendingReminders, setPendingReminders] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToUserReminders(user.uid, (reminders) => {
      // Find reminders where WhatsApp was sent and voice call is still pending
      const active = reminders.filter(
        (r) =>
          r.whatsappStatus === 'sent' &&
          r.voiceCallStatus === 'pending' &&
          r.whatsappReadStatus !== 'read' &&
          !r.seenOnWebsite
      );
      setPendingReminders(active);
    });

    return () => unsubscribe();
  }, [user]);

  if (!pendingReminders.length) return null;

  const handleAcknowledge = async (reminder) => {
    try {
      await acknowledgeReminder(reminder.id, reminder.eventId);
      toast.success('Marked as seen! Automated voice call cancelled.');
    } catch (err) {
      console.error('Failed to acknowledge reminder:', err);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-bounce-short">
      <div className="glass-card bg-gradient-to-r from-indigo-900/95 via-purple-900/95 to-slate-900/95 border border-indigo-400/30 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 animate-pulse">
            <Bell className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-white">
              {pendingReminders[0].eventTitle || 'Upcoming Event Reminder'}
            </h4>
            <p className="text-xs text-indigo-200 mt-0.5">
              WhatsApp reminder sent. Acknowledge now to cancel follow-up call.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleAcknowledge(pendingReminders[0])}
          className="btn-primary bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 min-h-[44px]"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>I&apos;ve Seen It (Cancel Call)</span>
        </button>
      </div>
    </div>
  );
}
