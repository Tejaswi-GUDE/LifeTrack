import { useState } from 'react';
import { apiSend } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

/**
 * Seed / Reset Demo Data — Build Spec §13. Calls POST /api/admin/seed/reset,
 * which wipes and reloads the seeded dataset (so the demo can be replayed).
 */
export default function AdminSeed() {
  const [state, setState] = useState('idle'); // idle | running | done | error
  const [message, setMessage] = useState(null);

  const reset = async () => {
    setState('running');
    setMessage(null);
    try {
      const res = await apiSend('POST', '/admin/seed/reset', { actorRole: 'government' });
      setState('done');
      setMessage(`Dataset reset at ${new Date(res.resetAt).toLocaleTimeString()}.`);
    } catch (e) {
      setState('error');
      setMessage(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Card title="Reset demo data" subtitle="Wipes every collection and reloads the 8-trainee seed dataset.">
        <p style={{ marginTop: 0, fontSize: 13, color: 'var(--slate)' }}>
          Use this before a demo run-through, or to undo intervention approvals, verification
          responses and follow-up submissions made during a session.
        </p>
        <Button variant="primary" onClick={reset} loading={state === 'running'} disabled={state === 'running'}>
          {state === 'running' ? 'Resetting…' : 'Reset demo data'}
        </Button>
        {message && (
          <div style={{ marginTop: 14 }}>
            <Alert tone={state === 'error' ? 'risk' : 'positive'} title={state === 'error' ? "Reset failed" : 'Reset complete'}>
              {message}
            </Alert>
          </div>
        )}
      </Card>
    </div>
  );
}
