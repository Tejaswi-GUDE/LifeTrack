import { useSession } from '../context/SessionContext';

/**
 * RoleGate — Build Spec §12. Wraps a route or a section; renders its children
 * only if the current session's role is in `allow`. Otherwise renders
 * `fallback` (a plain, non-apologetic note by default — Design System §22
 * writing principle).
 *
 * Foundation behaviour only: no redirects, no API. Route protection is added
 * with real auth in a later step.
 */
export default function RoleGate({ allow = [], fallback = null, children }) {
  const { role } = useSession();
  if (allow.length === 0 || allow.includes(role)) return children;
  return (
    fallback ?? (
      <div className="empty-state">
        <p style={{ margin: 0 }}>This view isn't available for your role.</p>
      </div>
    )
  );
}
