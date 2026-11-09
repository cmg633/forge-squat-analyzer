interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
  variant?: 'card' | 'text' | 'circle' | 'bar';
  height?: string;
}

export default function SkeletonLoader({
  className = '',
  lines = 3,
  variant = 'card',
  height = 'h-32',
}: SkeletonLoaderProps) {
  if (variant === 'circle') {
    return (
      <div
        className={`skeleton-shimmer rounded-full ${height} aspect-square ${className}`}
        role="status"
        aria-label="Loading…"
      />
    );
  }

  if (variant === 'bar') {
    return (
      <div
        className={`skeleton-shimmer rounded ${height} w-full ${className}`}
        role="status"
        aria-label="Loading…"
      />
    );
  }

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`} role="status" aria-label="Loading…">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton-shimmer rounded h-4 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  // 'card' variant
  return (
    <div
      className={`glass-card p-4 space-y-3 ${className}`}
      role="status"
      aria-label="Loading…"
    >
      <div className="skeleton-shimmer rounded h-3 w-1/4" />
      <div className="skeleton-shimmer rounded h-8 w-2/3" />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <div
          key={i}
          className={`skeleton-shimmer rounded h-3 ${i === lines - 3 ? 'w-4/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
