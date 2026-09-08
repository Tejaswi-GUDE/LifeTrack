import { useEffect, useRef, useState } from 'react';
import EmptyState from '../ui/EmptyState';

/**
 * Notifications entry. Per PRD §22 notifications are an in-app alerts panel
 * per dashboard — no real push. This is the topbar entry point; it opens a
 * small popover. No data yet, so it shows the caught-up empty state.
 */
const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M10 3a4 4 0 0 0-4 4v3l-1.5 2.5h11L14 10V7a4 4 0 0 0-4-4Z" />
    <path d="M8.5 15.5a1.5 1.5 0 0 0 3 0" />
  </svg>
);

export default function NotificationsMenu() {
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
    <span className="lt-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="shell-iconbtn"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
      </button>
      {open && (
        <div className="lt-menu" data-align="end" role="menu" style={{ minWidth: 260, padding: 0 }}>
          <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--slate-10)' }}>
            Notifications
          </div>
          <EmptyState message="You're all caught up." />
        </div>
      )}
    </span>
  );
}
