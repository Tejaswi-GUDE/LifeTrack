import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { apiSend } from '../../api/client';
import { useSession } from '../../context/SessionContext';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import { cn } from '../../lib/cn';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import RaiseRequestModal from '../../components/RaiseRequestModal';
import { fmtDate } from '../../lib/format';

const STATUS_BADGE = {
  open: 'outline-ochre',
  in_progress: 'outline-ochre',
  resolved: 'outline-teal',
};

export default function RequestsInbox() {
  const { role } = useSession();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState('all');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [err, setErr] = useState(null);

  const scopeKind = role === 'trainee' ? 'trainee' : role === 'provider' ? 'provider' : role === 'counsellor' ? 'counsellor' : 'noop';
  const scope = useScopedEntity(scopeKind);

  const params = useMemo(() => {
    if (role === 'trainee') return scope.id ? { traineeId: scope.id } : null;
    if (role === 'provider') return scope.id ? { providerId: scope.id, toRole: 'provider' } : null;
    if (role === 'counsellor') return scope.id ? { counsellorId: scope.id } : null;
    return {};
  }, [role, scope.id]);

  const waiting = (role === 'trainee' || role === 'provider' || role === 'counsellor') && !scope.id;
  const { data, error, loading, reload } = useApi(waiting ? null : '/requests', params);

  useTopbarActions(scope.Switcher, [scope.id]);

  const requests = data?.requests || [];
  const shown = tab === 'all' ? requests : requests.filter((r) => (tab === 'open' ? r.status !== 'resolved' : r.status === 'resolved'));
  const selectedId = sp.get('r') || shown[0]?.id || requests[0]?.id || null;
  const selected = requests.find((r) => r.id === selectedId) || null;

  const pick = (id) => { const n = new URLSearchParams(sp); n.set('r', id); setSp(n, { replace: false }); };

  const canReplyAs = role === 'trainee' ? 'trainee' : role === 'provider' ? 'provider' : 'counsellor';
  const canResolve = role === 'counsellor' || role === 'provider';

  const sendReply = async () => {
    if (!draft.trim() || !selected) return;
    setBusy(true); setErr(null);
    try {
      await apiSend('POST', `/requests/${selected.id}/messages`, { fromRole: canReplyAs, text: draft.trim() });
      setDraft('');
      reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const setStatus = async (status) => {
    if (!selected) return;
    setBusy(true); setErr(null);
    try {
      await apiSend('PATCH', `/requests/${selected.id}`, { status });
      reload();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (error || scope.error) return <ErrorState message="Couldn't load requests. Retry." onRetry={reload} />;
  if ((loading && !data) || waiting) {
    return <Card><Skeleton height={40} /><div style={{ height: 10 }} />{[0, 1, 2, 3].map((i) => <div key={i}><Skeleton height={48} /><div style={{ height: 6 }} /></div>)}</Card>;
  }

  const c = data?.counts || {};
  const trineeCard = role === 'trainee';

  return (
    <>
      <Card>
        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <h2 className="dash-section-title" style={{ margin: 0 }}>
            {requests.length} request{requests.length === 1 ? '' : 's'}
            <span className="dash-note" style={{ marginLeft: 8 }}>
              {(c.open || 0) + (c.in_progress || 0)} open · {c.resolved || 0} resolved
            </span>
          </h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Tabs
              items={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }]}
              value={tab}
              onChange={setTab}
            />
            {trineeCard && <Button variant="primary" onClick={() => setRaiseOpen(true)}>Raise a request</Button>}
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState message={trineeCard ? 'You have not raised any requests yet.' : 'No requests in this view.'} />
        ) : (
          <div className="req-layout">
            {/* list */}
            <div className="req-list">
              {shown.map((r) => (
                <button key={r.id} type="button" className={cn('req-row', r.id === selectedId && 'selected')} onClick={() => pick(r.id)}>
                  <div className="req-row-top">
                    <span className="req-subject">{r.subject}</span>
                    <Badge variant={STATUS_BADGE[r.status] || 'neutral'}>{r.statusLabel}</Badge>
                  </div>
                  <div className="dash-note" style={{ marginTop: 2 }}>
                    {role !== 'trainee' ? `${r.traineeName} · ` : ''}{r.categoryLabel}
                    {r.course ? ` · ${r.course}` : ''} · {r.messageCount} message{r.messageCount === 1 ? '' : 's'}
                  </div>
                </button>
              ))}
            </div>

            {/* thread */}
            <div className="req-thread">
              {!selected ? (
                <EmptyState message="Select a request." />
              ) : (
                <>
                  <div className="req-thread-head">
                    <div>
                      <div style={{ fontWeight: 600 }}>{selected.subject}</div>
                      <div className="dash-note" style={{ marginTop: 2 }}>
                        {selected.categoryLabel} · to {selected.toRole}
                        {selected.toRole === 'counsellor' && selected.counsellor ? ` · ${selected.counsellor.name}` : ''}
                        {role !== 'trainee' ? ` · ${selected.traineeName}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {role !== 'trainee' && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/${role}/trainee/${selected.traineeId}`)}>
                          Open profile
                        </Button>
                      )}
                      {canResolve && selected.status !== 'resolved' && (
                        <Button variant="secondary" size="sm" loading={busy} onClick={() => setStatus('resolved')}>Mark resolved</Button>
                      )}
                      {canResolve && selected.status === 'resolved' && (
                        <Button variant="ghost" size="sm" loading={busy} onClick={() => setStatus('in_progress')}>Reopen</Button>
                      )}
                    </div>
                  </div>

                  <div className="req-msgs">
                    {selected.messages.map((m, i) => (
                      <div key={i} className={cn('req-msg', m.fromRole === canReplyAs ? 'mine' : 'theirs')}>
                        <div className="req-msg-meta">{m.fromName || m.fromRole} · {fmtDate(m.at)}</div>
                        <div className="req-msg-text">{m.text}</div>
                      </div>
                    ))}
                  </div>

                  {selected.status === 'resolved' ? (
                    <p className="dash-note">This request is resolved.{canResolve ? ' Reopen it to continue the conversation.' : ''}</p>
                  ) : (
                    <div className="req-reply">
                      <Input
                        multiline
                        rows={2}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={role === 'trainee' ? 'Reply to your counsellor / provider…' : 'Type a reply…'}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        {err ? <span className="dash-note" style={{ color: 'var(--brick)' }}>{err}</span> : <span />}
                        <Button variant="primary" size="sm" loading={busy} disabled={!draft.trim()} onClick={sendReply}>Send reply</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {role === 'counsellor' && scope.name && (
        <p className="dash-note" style={{ marginTop: 12 }}>
          Signed in as <strong>{scope.name}</strong>. You see requests from trainees on your assigned course(s).
        </p>
      )}

      {trineeCard && (
        <RaiseRequestModal
          open={raiseOpen}
          onClose={() => setRaiseOpen(false)}
          traineeId={scope.id}
          counsellorName={requests[0]?.counsellor?.name}
          onCreated={(r) => { reload(); if (r?.id) pick(r.id); }}
        />
      )}
    </>
  );
}
