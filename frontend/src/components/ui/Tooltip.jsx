import { useId, useState } from 'react';
import { cn } from '../../lib/cn';

/**
 * Tooltip — Design System §21.
 * --ink background, white text, body-small, --radius-sm, --shadow-md, arrow.
 * ONLY for genuinely supplementary info (an abbreviation, a precise
 * timestamp). Never used to hide information the Design System requires to be
 * always visible (risk factors, insight data points).
 *
 * props: content, side ('top' | 'bottom'), children (the trigger)
 */
export default function Tooltip({ content, side = 'top', children, className }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (content == null || content === '') return children;

  return (
    <span
      className={cn('lt-tooltip-wrap', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open && (
        <span role="tooltip" id={id} className="lt-tooltip" data-side={side}>
          {content}
        </span>
      )}
    </span>
  );
}
