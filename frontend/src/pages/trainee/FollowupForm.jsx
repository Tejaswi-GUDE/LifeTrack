import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { apiSend } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { fmtDate } from '../../lib/format';

/** Conversational follow-up check-in (PRD §12). Questions come from the API;
 *  the answer POSTs to /api/followups/:id/response and marks it completed. */
export default function FollowupForm() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(scheduleId ? `/followups/${scheduleId}/questions` : null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);

  const visible = useMemo(() => {
    if (!data) return [];
    return data.questions.filter((q) => {
      if (!q.showIf) return true;
      return Object.entries(q.showIf).every(([k, vals]) => vals.includes(answers[k]));
    });
  }, [data, answers]);

  if (error) return <ErrorState message="Couldn't load this check-in. Retry." onRetry={reload} />;
  if (loading && !data) return <Card><Skeleton height={260} /></Card>;
  if (!data) return null;

  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiSend('POST', `/followups/${scheduleId}/response`, { channel: 'web', answers });
      setDone(true);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ maxWidth: 560 }}>
        <Alert tone="positive" title="Thank you — your check-in has been recorded">
          Your outcome record is now up to date.
        </Alert>
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => navigate('/trainee/followups')}>Back to follow-ups</Button>
          <Button variant="primary" onClick={() => navigate('/trainee/home')}>Go to My Career</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Card
        title={`Day ${data.checkpointDay} check-in`}
        subtitle={`Scheduled ${fmtDate(data.scheduledDate)}${data.traineeName ? ` · ${data.traineeName}` : ''}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {visible.map((q) => (
            <div key={q.id} className="field">
              <label className="field-label" htmlFor={`q-${q.id}`}>{q.prompt}</label>
              {q.type === 'choice' ? (
                <select
                  id={`q-${q.id}`}
                  className="select select--field"
                  value={answers[q.id] || ''}
                  onChange={(e) => set(q.id, e.target.value)}
                >
                  <option value="">Choose…</option>
                  {q.options.map((o) => (
                    <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`q-${q.id}`}
                  type={q.type === 'number' ? 'number' : 'text'}
                  value={answers[q.id] || ''}
                  onChange={(e) => set(q.id, e.target.value)}
                  placeholder={q.type === 'number' ? '₹ per month' : ''}
                />
              )}
            </div>
          ))}
        </div>

        {submitError && <p className="dash-note" style={{ color: 'var(--brick)', marginTop: 12 }}>{submitError}</p>}

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={() => navigate('/trainee/followups')} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={submitting} disabled={!answers.status}>
            Submit check-in
          </Button>
        </div>
      </Card>
    </div>
  );
}
