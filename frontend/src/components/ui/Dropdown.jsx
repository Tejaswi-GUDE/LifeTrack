import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import Button from './Button';

/**
 * Dropdown — a menu popover (Design System §7 shadow-md surface).
 * Use for a small set of secondary actions (e.g. an "Actions" overflow menu
 * that the flagship Trainee Profile collapses into on mobile).
 *
 * props:
 *   label:   trigger text
 *   variant: trigger button variant (default 'secondary')
 *   size:    trigger button size (default 'sm')
 *   align:   'start' | 'end'  (default 'start')
 *   items:   Array<{ label, onSelect, danger?, disabled?, icon? } | { separator: true }>
 */
export default function Dropdown({ label, variant = 'secondary', size = 'sm', align = 'start', items = [], className }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className={cn('lt-menu-wrap', className)} ref={wrapRef}>
      <Button
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </Button>
      {open && (
        <div className="lt-menu" data-align={align} role="menu">
          {items.map((it, i) =>
            it.separator ? (
              <div className="lt-menu-sep" key={`sep-${i}`} />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={cn('lt-menu-item', it.danger && 'lt-menu-item--danger')}
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect?.();
                }}
              >
                {it.icon && <span aria-hidden="true">{it.icon}</span>}
                <span>{it.label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </span>
  );
}
