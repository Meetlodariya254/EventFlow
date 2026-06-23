import { CalendarPlus, Sparkles } from 'lucide-react';

const EmptyState = ({ onCreateEvent }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in-up">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 flex items-center justify-center">
          <CalendarPlus className="w-16 h-16 text-primary-400 dark:text-primary-500" />
        </div>
        <div className="absolute -top-2 -right-2">
          <Sparkles className="w-8 h-8 text-accent-400 animate-pulse-soft" />
        </div>
        {/* Floating dots */}
        <div className="absolute -bottom-1 -left-4 w-3 h-3 rounded-full bg-secondary-300 dark:bg-secondary-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="absolute top-4 -right-6 w-2 h-2 rounded-full bg-accent-300 dark:bg-accent-600 animate-bounce" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-8 -left-8 w-2.5 h-2.5 rounded-full bg-primary-300 dark:bg-primary-600 animate-bounce" style={{ animationDelay: '0.8s' }} />
      </div>

      {/* Text */}
      <h3 className="text-2xl font-heading font-bold text-surface-800 dark:text-surface-100 mb-2 text-center">
        No events yet
      </h3>
      <p className="text-surface-500 dark:text-surface-400 text-center max-w-md mb-8 leading-relaxed">
        Your calendar is looking empty! Create your first event and start organizing your schedule with smart reminders.
      </p>

      {/* CTA Button */}
      <button
        onClick={onCreateEvent}
        className="btn-primary text-base px-8 py-3 group"
        id="empty-state-create-btn"
      >
        <CalendarPlus className="w-5 h-5 transition-transform group-hover:rotate-12" />
        Create Your First Event
      </button>

      {/* Feature hints */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl w-full">
        {[
          { emoji: '📅', text: 'Interactive Calendar' },
          { emoji: '📱', text: 'WhatsApp Reminders' },
          { emoji: '📞', text: 'Voice Call Fallback' },
        ].map((feature, i) => (
          <div
            key={i}
            className="group text-center p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200/50 dark:border-surface-700/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-white dark:hover:bg-surface-800 hover:border-primary-200/50 dark:hover:border-primary-700/50 cursor-default"
          >
            <span className="text-xl mb-1 block transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6">{feature.emoji}</span>
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400 transition-colors duration-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
              {feature.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmptyState;
