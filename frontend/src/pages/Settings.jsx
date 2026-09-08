import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { ROLE_LABEL } from '../config/nav';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

/**
 * Settings / Consent — shared across government / provider / counsellor.
 * Deliberately light: this is a demo prototype with mock role login (no real
 * account settings). Privacy-by-design is surfaced here per PRD §21.
 */
export default function Settings() {
  const { session, role, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 640 }}>
      <Card title="Session" subtitle="Mock role login — no password, for the SIH demo.">
        <div className="dash-list-row">
          <span>Signed in as</span>
          <strong>{session?.name || ROLE_LABEL[role] || 'Unknown'}</strong>
        </div>
        <div className="dash-list-row">
          <span>Role</span>
          <Badge variant="outline-slate">{ROLE_LABEL[role] || role}</Badge>
        </div>
        {session?.providerName && (
          <div className="dash-list-row"><span>Provider scope</span><strong>{session.providerName}</strong></div>
        )}
        <div style={{ marginTop: 14 }}>
          <Button variant="secondary" onClick={() => { signOut(); navigate('/login'); }}>
            Sign out
          </Button>
        </div>
      </Card>

      <div style={{ height: 20 }} />

      <Card title="Privacy &amp; consent" subtitle="PRD §21 — privacy by design">
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--slate)' }}>
          Every trainee independently grants consent for data collection, employer contact and
          de-identified analytics. Government views are aggregated and never expose an identified
          record without a justification flag. All writes are recorded in an audit log.
        </p>
        <p style={{ fontSize: 13, color: 'var(--slate)' }}>
          Trainees manage their own consent from{' '}
          <Link to="/trainee/consent" style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
            My Career → Consent
          </Link>
          .
        </p>
      </Card>

      {role === 'government' && (
        <>
          <div style={{ height: 20 }} />
          <Card title="Demo data" subtitle="Reset the seeded dataset to a known state before a run-through.">
            <Link to="/admin/seed" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Open seed / reset
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
