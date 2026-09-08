import { useState } from 'react';
import { cn } from '../../lib/cn';

/**
 * Tabs — rendered as the approved segmented control (tokens.css `.seg`).
 * The flagship screens use this exact pattern for "By Provider / By District",
 * risk-band filters, and "All data / Verified only". Controlled or
 * uncontrolled.
 *
 * props:
 *   items: Array<{ value, label }>
 *   value / defaultValue / onChange
 *   ariaLabel
 */
export default function Tabs({ items = [], value, defaultValue, onChange, ariaLabel, className }) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = isControlled ? value : internal;

  const select = (v) => {
    if (!isControlled) setInternal(v);
    onChange?.(v);
  };

  return (
    <div className={cn('seg', className)} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={active === it.value}
          className={cn(active === it.value && 'active')}
          onClick={() => select(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
