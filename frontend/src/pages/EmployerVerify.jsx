import { useParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

/**
 * Employer Verification — link-based, NO sidebar (Design System §"Applying
 * this consistently across all seven surfaces"). Employers never sign in;
 * they open one request via a shared link. Placeholder for this step.
 */
export default function EmployerVerify() {
  const { verificationId } = useParams();
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
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 21, marginBottom: 2 }}>LifeTrack</div>
        <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20 }}>Employment verification request</div>
        <Card title="Verification request" subtitle="Screen not built yet — application shell step.">
          <EmptyState message="The confirm / dispute screen will be implemented in a later step." />
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--slate)' }}>
            Request:{' '}
            <code style={{ fontFamily: 'var(--mono)' }}>{verificationId}</code>
          </div>
        </Card>
      </div>
    </div>
  );
}
