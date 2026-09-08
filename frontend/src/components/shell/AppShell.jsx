import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { getPageMeta, roleHome } from '../../config/nav';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { TopbarSlotProvider } from './TopbarSlot';
import ErrorBoundary from '../ErrorBoundary';

/**
 * AppShell — the one product frame (Design System §8/§19): an --ink sidebar
 * around a --paper content area, with a topbar. Identical for every role;
 * only the sidebar's items change. Used as a layout route so it stays
 * mounted across navigation.
 *
 * Requires a session — unauthenticated visitors are sent to /login.
 */
export default function AppShell() {
  const { session, role } = useSession();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const meta = getPageMeta(location.pathname);

  return (
    <TopbarSlotProvider>
      <div className="app">
        <Sidebar
          role={role}
          open={navOpen}
          onClose={() => setNavOpen(false)}
          homeTo={roleHome(role)}
          userName={session.name}
        />
        {navOpen && <div className="shell-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}

        <div className="main">
          <Topbar
            crumb={meta.crumb}
            title={meta.title}
            role={role}
            userName={session.name}
            onOpenNav={() => setNavOpen(true)}
          />
          <main className="content">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </TopbarSlotProvider>
  );
}
