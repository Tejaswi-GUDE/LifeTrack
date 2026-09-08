import { cn } from '../../lib/cn';

/**
 * Loading state — Design System §22.
 * Skeletons preserve layout in the exact shape of the content they replace,
 * with a slow single-direction shimmer (tokens.css `.skeleton`). No spinners
 * on full-page loads — Spinner is for in-button / inline use only.
 */
export function Skeleton({ width, height = 16, radius, className, style }) {
  return (
    <span
      aria-hidden="true"
      className={cn('skeleton', className)}
      style={{
        display: 'block',
        width: width ?? '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = '60%', className }) {
  return (
    <span className={cn('block', className)} aria-hidden="true" role="presentation">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="skeleton skeleton-text"
          style={{ display: 'block', width: i === lines - 1 ? lastWidth : '100%' }}
        />
      ))}
    </span>
  );
}

export function Spinner({ label = 'Loading', className }) {
  return (
    <span className={cn('inline-flex items-center', className)} role="status" aria-live="polite">
      <span className="lt-spinner" aria-hidden="true" />
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {label}
      </span>
    </span>
  );
}
