import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { apiSend } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { fmtDate } from '../../lib/format';

/**
 * Employer Verification — link-based, NO sidebar (Design System §"seven
 * surfaces"). Employer confirms / disputes one reported hire.
 * GET /api/verifications/:id  ·  POST /api/verifications/:id/respond
 */
function Frame({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--paper)' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 21, marginBottom: 2 }}>LifeTrack</div>
        <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 20 }}>Employment verification request</div>
        {children}
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  confirmed: { variant: 'solid-teal', text: 'Confirmed' },
  disputed: { variant: 'dashed-brick', text: 'Disputed' },
  no_record: { variant: 'dashed-brick', text: 'No record' },
  pending: { variant: 'neutral', text: 'Awaiting your response' },
};

export default function EmployerVerify() {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(verificationId ? `/verifications/${verificationId}` : null);
  const [submitting, setSubmitting] = useState(null);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const respond = async (status) => {
    setSubmitting(status);
    setSubmitError(null);
    try {
      await apiSend('POST', `/verifications/${verificationId}/respond`, { status });
      setResult(status);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(null);
    }
  };

  if (error) {
    return (
      <Frame>
        <ErrorState message="This verification link is invalid or has expired." onRetry={reload} />
      </Frame>
    );
  }
  if (loading && !data) {
    return <Frame><Card><Skeleton height={180} /></Card></Frame>;
  }
  if (!data) return null;

  const settled = result || (data.status !== 'pending' ? data.status : null);

  if (settled) {
    return (
      <Frame>
        <Alert
          tone={settled === 'confirmed' ? 'positive' : 'warning'}
          title={settled === 'confirmed' ? 'Thank you — employment confirmed' : settled === 'disputed' ? 'Recorded as disputed' : 'Recorded as no record'}
        >
          This response has been logged against {data.trainee ? data.trainee.name : 'the candidate'}'s record.
        </Alert>
        <div style={{ marginTop: 16 }}>
          <Button variant="secondary" onClick={() => navigate('/employer/dashboard')}>Back to employer dashboard</Button>
        </div>
      </Frame>
    );
  }

  const b = STATUS_BADGE[data.status] || STATUS_BADGE.pending;

  return (
    <Frame>
      <Card title="Please confirm this employment" subtitle={data.employerName}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate)', fontSize: 13 }}>Candidate</span><strong style={{ fontSize: 13 }}>{data.trainee ? data.trainee.name : '—'}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate)', fontSize: 13 }}>Claimed role</span><strong style={{ fontSize: 13 }}>{data.claim.role || '—'}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate)', fontSize: 13 }}>Claimed join date</span><strong style={{ fontSize: 13 }}>{data.claim.joinDate ? fmtDate(data.claim.joinDate) : '—'}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: 'var(--slate)', fontSize: 13 }}>Status</span><Badge variant={b.variant}>{b.text}</Badge></div>
        </div>

        {submitError && <p className="dash-note" style={{ color: 'var(--brick)' }}>{submitError}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => respond('confirmed')} loading={submitting === 'confirmed'} disabled={!!submitting}>
            Confirm
          </Button>
          <Button variant="secondary" onClick={() => respond('disputed')} loading={submitting === 'disputed'} disabled={!!submitting}>
            Dispute
          </Button>
          <Button variant="secondary" onClick={() => respond('no_record')} loading={submitting === 'no_record'} disabled={!!submitting}>
            No record
          </Button>
        </div>
      </Card>
    </Frame>
  );
}
