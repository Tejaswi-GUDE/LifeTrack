import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Drawer / side sheet — Design System §9/§20 surface language
 * (--paper-raised, --radius-lg, --shadow-lg, --ink @ 40% scrim).
 * Used for contextual detail that shouldn't take over the page — e.g. a
 * case-detail drawer off a worklist row. Detail viewing lives here or
 * inline; consequential actions live in Modal.
 *
 * props: open, onClose, title, children, footer
 */
export default function Drawer({ open, onClose, title, footer, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="lt-scrim lt-scrim--drawer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        className="lt-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        {title != null && (
          <div className="lt-drawer-header">
            <div className="lt-drawer-title">{title}</div>
            <button type="button" className="lt-x" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="lt-drawer-body">{children}</div>
        {footer != null && <div className="lt-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
