import Button from './Button';
import { cn } from '../../lib/cn';

/**
 * Error state — Design System §14 / §22.
 * Reuses the alert component with a --brick left-accent. States what failed
 * in plain language and offers the one recovery action. Never a generic
 * "Something went wrong."
 *
 * props: message, onRetry, retryLabel
 */
const AlertIcon = () => (
  <svg className="a-icon" viewBox="0 0 20 20" fill="none" stroke="var(--brick)" strokeWidth="1.6" aria-hidden="true">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 6v5M10 14h.01" />
  </svg>
);

export default function ErrorState({
  message = "Couldn't load this. Retry.",
  onRetry,
  retryLabel = 'Retry',
  className,
}) {
  return (
    <div className={cn('alert', className)} role="alert">
      <AlertIcon />
      <div style={{ flex: 1 }}>
        <div className="a-title">{message}</div>
        {onRetry && (
          <div style={{ marginTop: 8 }}>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
