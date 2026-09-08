import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { ROLE_LABEL, settingsRouteForRole } from '../../config/nav';
import Badge from '../ui/Badge';
import Dropdown from '../ui/Dropdown';
import NotificationsMenu from './NotificationsMenu';
import { TopbarActions } from './TopbarSlot';

/**
 * Topbar — Design System §19.
 * Sits inside the --paper content area (not part of the sidebar). Shows a
 * breadcrumb-style page title (crumb + H1 Plex Serif), a role indicator, the
 * notifications entry, and a profile/settings menu. No global search box.
 * The hamburger appears only below 768px.
 */
const HamburgerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M3 5h14M3 10h14M3 15h14" />
  </svg>
);

function initialsOf(name, role) {
  const src = (name || role || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  const letters = (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)) || '?';
  return letters.toUpperCase();
}

export default function Topbar({ crumb, title, role, userName, onOpenNav }) {
  const { signOut } = useSession();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button
          type="button"
          className="shell-hamburger"
          aria-label="Open navigation"
          onClick={onOpenNav}
        >
          <HamburgerIcon />
        </button>
        <div className="titleblock" style={{ minWidth: 0 }}>
          {crumb ? <div className="crumb">{crumb}</div> : null}
          <h1>{title}</h1>
        </div>
      </div>

      <div className="controls">
        <TopbarActions />
        <Badge tone="slate" fill="outline" className="shell-role">
          {ROLE_LABEL[role] || 'LifeTrack'}
        </Badge>
        <NotificationsMenu />
        <Dropdown
          label={initialsOf(userName, role)}
          align="end"
          items={[
            { label: userName || ROLE_LABEL[role], disabled: true },
            { separator: true },
            { label: 'Settings / Consent', onSelect: () => navigate(settingsRouteForRole(role)) },
            { label: 'Sign out', danger: true, onSelect: () => { signOut(); navigate('/login'); } },
          ]}
        />
      </div>
    </header>
  );
}
