const SkeletonLoader = ({ type = 'card', count = 3 }) => {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-surface-800 rounded-card p-5 border border-surface-200 dark:border-surface-700 animate-fade-in"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="skeleton h-5 w-3/4 mb-2 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-8 w-8 rounded-full" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700">
              <div className="skeleton h-8 w-16 rounded" />
              <div className="skeleton h-8 w-16 rounded" />
              <div className="skeleton h-8 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-surface-800 rounded-card p-5 border border-surface-200 dark:border-surface-700"
          >
            <div className="skeleton h-4 w-20 mb-3 rounded" />
            <div className="skeleton h-8 w-12 mb-1 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-surface-800 rounded-lg p-4 border border-surface-200 dark:border-surface-700 flex items-center gap-3"
          >
            <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1">
              <div className="skeleton h-4 w-1/3 mb-2 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default SkeletonLoader;
