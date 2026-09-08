import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import Button from '../components/ui/Button';

/**
 * A deliberately plain frame for the foundation step. It is NOT the product
 * shell (the --ink sidebar from Design System §19) — that's built with the
 * dashboards in a later step. This exists only so routing and token
 * application can be validated by eye.
 */
const QUICK_LINKS = [
  ['/login', 'Login'],
  ['/government/dashboard', 'Government'],
  ['/provider/dashboard', 'Provider'],
  ['/counsellor/worklist', 'Counsellor'],
  ['/trainee/home', 'Trainee'],
  ['/employer/verify/demo', 'Employer verify'],
  ['/admin/seed', 'Admin'],
  ['/ui', 'UI primitives'],
];

export default function FoundationFrame({ children }) {
  const { session, signOut } = useSession();
  return (
    <div className="lt-frame">
      <div className="lt-frame-bar">
        <span className="wordmark">LifeTrack</span>
        <nav>
          {QUICK_LINKS.map(([to, label]) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
        </nav>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', display: 'flex', gap: 10, alignItems: 'center' }}>
          {session ? `Signed in: ${session.name || session.role}` : 'Not signed in'}
          {session && (
            <Button variant="ghost" size="sm" style={{ color: '#fff' }} onClick={signOut}>
              Sign out
            </Button>
          )}
        </span>
      </div>
      <div className="lt-frame-body">{children}</div>
    </div>
  );
}
