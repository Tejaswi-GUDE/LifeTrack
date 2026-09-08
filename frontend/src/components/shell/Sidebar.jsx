import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { navForRole, ROLE_LABEL } from '../../config/nav';

/**
 * Sidebar — Design System §19.
 * Fixed left rail, --ink background, wordmark (not a logo icon), role-scoped
 * text nav items (no icons-only), 3px --teal left-accent on the active item,
 * current user pinned to the bottom. Same component + width for every role;
 * only the nav items change. On <768px it becomes a slide-in drawer.
 */
function isItemActive(pathname, item) {
  if (pathname === item.to) return true;
  return (item.match || []).some((m) => pathname === m || pathname.startsWith(m + '/'));
}

export default function Sidebar({ role, open, onClose, homeTo, userName }) {
  const { pathname } = useLocation();
  const items = navForRole(role);
  const roleLabel = ROLE_LABEL[role] || 'LifeTrack';

  return (
    <aside className={cn('sidebar', open && 'is-open')} aria-label="Primary navigation">
      <button type="button" className="shell-close" aria-label="Close navigation" onClick={onClose}>
        ✕
      </button>

      <Link to={homeTo} className="wordmark" style={{ color: '#fff', textDecoration: 'none' }} onClick={onClose}>
        LifeTrack
      </Link>
      <div className="role-tag">{roleLabel}</div>

      <nav>
        {items.map((it) => {
          const active = isItemActive(pathname, it);
          return (
            <Link
              key={it.key}
              to={it.to}
              className={cn(active && 'active')}
              aria-current={active ? 'page' : undefined}
              onClick={onClose}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="who">
        <strong>{userName || 'Signed in'}</strong>
        {roleLabel}
      </div>
    </aside>
  );
}
