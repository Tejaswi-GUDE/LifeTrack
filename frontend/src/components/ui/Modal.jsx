import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal — Design System §20.
 * --paper-raised, --radius-lg, --shadow-lg. Scrim = --ink @ 40%, no blur.
 * Header: H2 title + close control, bottom border. Footer: right-aligned,
 * Secondary then Primary (committing action rightmost). Used only for
 * actions with consequence — never for plain detail viewing.
 *
 * props: open, onClose, title, footer, wide, children
 */
export default function Modal({ open, onClose, title, footer, wide = false, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // move focus into the dialog
    const t = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="lt-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={panelRef}
        className={`lt-modal${wide ? ' lt-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {title != null && (
          <div className="lt-modal-header">
            <div className="lt-modal-title">{title}</div>
            <button type="button" className="lt-x" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="lt-modal-body">{children}</div>
        {footer != null && <div className="lt-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
