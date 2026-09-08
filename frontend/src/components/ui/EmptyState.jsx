import Button from './Button';
import { cn } from '../../lib/cn';

/**
 * Empty state — Design System §22.
 * Centred within the card/panel: a single-line statement of fact, then the
 * one relevant action if one exists. No illustration — the ledger concept
 * treats an empty section as an unfilled record, not a mood moment.
 *
 * props: message, action { label, onClick } | undefined
 */
export default function EmptyState({ message, action, className }) {
  return (
    <div className={cn('empty-state', className)}>
      <p style={{ margin: 0 }}>{message}</p>
      {action && (
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
