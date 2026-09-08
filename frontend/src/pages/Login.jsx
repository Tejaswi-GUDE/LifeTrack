import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

/**
 * Login — foundation version only.
 * The real screen is a role selector → seeded-user dropdown → POST
 * /api/auth/login (Build Spec §7). For now it just sets a role on the client
 * session so role-scoped routing can be exercised. No backend call.
 */
const ROLES = [
  { role: 'government', label: 'Government / Policymaker', to: '/government/dashboard' },
  { role: 'provider', label: 'Training Provider', to: '/provider/dashboard' },
  { role: 'counsellor', label: 'Counsellor', to: '/counsellor/worklist' },
  { role: 'trainee', label: 'Trainee', to: '/trainee/home' },
  { role: 'employer', label: 'Employer', to: '/employer/dashboard' },
];

export default function Login() {
  const { signIn } = useSession();
  const navigate = useNavigate();

  const pick = (r) => {
    signIn({ role: r.role, name: r.label });
    navigate(r.to);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--paper)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 27, marginBottom: 2 }}>LifeTrack</div>
        <div style={{ fontSize: 13, color: 'var(--slate)', marginBottom: 24 }}>
          Longitudinal skilling outcomes &amp; livelihood intelligence
        </div>

        <Card title="Choose a role to continue" subtitle="Demo login — no password required.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {ROLES.map((r) => (
              <Button key={r.role} variant="secondary" onClick={() => pick(r)} style={{ justifyContent: 'flex-start' }}>
                {r.label}
              </Button>
            ))}
          </div>
        </Card>

        <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 16 }}>
          Employers normally act on a shared verification link; the Employer role here is for the demo.
        </div>
      </div>
    </div>
  );
}
