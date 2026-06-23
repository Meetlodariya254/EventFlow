import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'md', fullPage = false, text = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} text-primary-500 animate-spin`} />
      {text && (
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400 animate-pulse-soft">
          {text}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-50/80 dark:bg-surface-950/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
