import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './risk-center.css';
import { useApi } from '../../hooks/useApi';
import { apiSend } from '../../api/client';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import { cn } from '../../lib/cn';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import InsightPanel from '../../components/ui/InsightPanel';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const bandColor = (b) => (b === 'high' ? 'var(--brick)' : b === 'medium' ? 'var(--ochre)' : 'var(--teal)');
const bandTone = (b) => (b === 'high' ? 'brick' : b === 'medium' ? 'ochre' : 'teal');
const priorityVariant = (p) => (p === 'high' ? 'outline-brick' : p === 'medium' ? 'outline-ochre' : 'outline-teal');
const reviewDotMod = (s) =>
  s === 'in_progress' ? 'review-dot--approved' : s === 'completed' ? 'review-dot--completed' : undefined;

const BANDS = [
  ['all', 'All risk'],
  ['high', 'High'],
  ['medium', 'Medium'],
  ['low', 'Low'],
];
const STATUS_FILTERS = [
  ['all', 'All statuses'],
  ['at_risk', 'At-risk'],
  ['non_responsive', 'Non-responsive'],
  ['needs_review', 'Needs verification review'],
];

function ListRow({ t, selected, onClick }) {
  return (
    <button type="button" className={cn('lrow', selected && 'selected')} onClick={onClick} aria-current={selected ? 'true' : undefined}>
      <span className="lname">{t.name}</span>
      <span className="lmeta">
        {[t.course, t.district, t.currentStatusLabel].filter(Boolean).join(' · ')}
      </span>
      <span className="lrisk">
        <span className="risk-bar-track">
          <span
            className="risk-bar-fill"
            style={{ width: `${Math.max(2, t.outcomeRisk.score)}%`, background: bandColor(t.outcomeRisk.band) }}
          />
        </span>
        <span className="score">
          {t.outcomeRisk.score} · {cap(t.outcomeRisk.band)}
        </span>
      </span>
    </button>
  );
}

/* ======================================================================== */
export default function RiskCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [band, setBand] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [dismissReason, setDismissReason] = useState('');
  const [reassignTo, setReassignTo] = useState('');
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState(null);

  const listApi = useApi('/trainees');
  const trainees = listApi.data?.trainees || [];

  const shown = trainees.filter((t) => {
    if (band !== 'all' && t.outcomeRisk.band !== band) return false;
    if (statusFilter !== 'all' && !(t.flags || []).includes(statusFilter)) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedId = searchParams.get('t') || trainees[0]?.id || null;
  const riskApi = useApi(selectedId ? `/trainees/${selectedId}/risk` : null);
  const r = riskApi.data;

  useTopbarActions(
    <>
      <div className="seg" role="group" aria-label="Risk band filter">
        {BANDS.map(([v, l]) => (
          <button key={v} type="button" className={band === v ? 'active' : ''} onClick={() => setBand(v)}>
            {l}
          </button>
        ))}
      </div>
      <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status filter">
        {STATUS_FILTERS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </>,
    [band, statusFilter],
  );

  const selectTrainee = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('t', id);
    setSearchParams(next, { replace: false });
  };

  const openModal = (m) => {
    setActionError(null);
    if (m === 'dismiss') setDismissReason('');
    if (m === 'reassign') setReassignTo((r && r.assigneeOptions && r.assigneeOptions[0] && r.assigneeOptions[0].id) || '');
    setModal(m);
  };
  const closeModal = () => {
    if (!acting) setModal(null);
  };
  const afterWrite = () => {
    setModal(null);
    riskApi.reload();
    listApi.reload();
  };

  async function doApprove() {
    setActing(true);
    setActionError(null);
    try {
      const iv = r.recommendedIntervention;
      const counsellor = (r.assigneeOptions || []).find((a) => a.role === 'counsellor');
      if (iv.id) {
        await apiSend('PATCH', `/interventions/${iv.id}`, { status: 'in_progress', assignedTo: counsellor && counsellor.id });
      } else {
        await apiSend('POST', '/interventions', {
          traineeId: r.trainee.id,
          type: iv.type,
          rationale: iv.rationale,
          assignedTo: counsellor && counsellor.id,
        });
      }
      afterWrite();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActing(false);
    }
  }
  async function doDismiss() {
    if (!dismissReason.trim()) return;
    setActing(true);
    setActionError(null);
    try {
      const iv = r.recommendedIntervention;
      if (!iv.id) {
        setActionError('There is no persisted recommendation to dismiss yet.');
        return;
      }
      await apiSend('PATCH', `/interventions/${iv.id}`, { status: 'dismissed', outcomeNotes: dismissReason.trim() });
      afterWrite();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActing(false);
    }
  }
  async function doReassign() {
    setActing(true);
    setActionError(null);
    try {
      const iv = r.recommendedIntervention;
      if (!iv.id) {
        setActionError('Approve the intervention before reassigning it.');
        return;
      }
      await apiSend('PATCH', `/interventions/${iv.id}`, { assignedTo: reassignTo });
      afterWrite();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActing(false);
    }
  }

  /* ---------------- screen-level states ---------------- */
  if (listApi.error) {
    return <ErrorState message="Couldn't load the worklist. Retry." onRetry={listApi.reload} />;
  }
  if (listApi.loading && !listApi.data) {
    return (
      <div className="center-layout">
        <div className="list-pane" style={{ padding: 18 }}>
          <Skeleton height={36} />
          <div style={{ height: 12 }} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <Skeleton height={56} />
              <div style={{ height: 6 }} />
            </div>
          ))}
        </div>
        <div className="detail-pane">
          <Skeleton width="40%" height={24} />
          <div style={{ height: 20 }} />
          <Skeleton width="60%" height={46} />
          <div style={{ height: 20 }} />
          <Skeleton height={140} />
        </div>
      </div>
    );
  }

  const countLine =
    shown.length === trainees.length
      ? `${trainees.length} trainee${trainees.length === 1 ? '' : 's'} · sorted by risk score`
      : `${shown.length} of ${trainees.length} · sorted by risk score`;

  return (
    <>
      <div className="center-layout">
        {/* -------- list pane -------- */}
        <div className="list-pane">
          <div className="list-toolbar">
            <div className="row1">
              <div className="search" style={{ flex: 1 }}>
                <input
                  placeholder="Search trainees…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%' }}
                  aria-label="Search trainees"
                />
              </div>
            </div>
          </div>
          <div className="list-count">{countLine}</div>
          <div className="list-rows">
            {shown.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 18px' }}>
                <p style={{ margin: 0 }}>
                  {trainees.length === 0
                    ? 'No trainees currently at risk in your queue.'
                    : 'No trainees match this filter.'}
                </p>
              </div>
            ) : (
              shown.map((t) => (
                <ListRow key={t.id} t={t} selected={t.id === selectedId} onClick={() => selectTrainee(t.id)} />
              ))
            )}
          </div>
        </div>

        {/* -------- detail pane -------- */}
        <div className="detail-pane">
          {!selectedId ? (
            <EmptyState message="Select a trainee to review their risk and recommended intervention." />
          ) : riskApi.error ? (
            <ErrorState message="Couldn't load this trainee's risk record. Retry." onRetry={riskApi.reload} />
          ) : riskApi.loading && !r ? (
            <>
              <Skeleton width="35%" height={24} />
              <div style={{ height: 20 }} />
              <Skeleton width="55%" height={46} />
              <div style={{ height: 18 }} />
              <Skeleton height={120} />
              <div style={{ height: 18 }} />
              <Skeleton height={90} />
            </>
          ) : !r ? null : (
            <>
              <div className="detail-header">
                <div>
                  <div className="detail-name">{r.trainee.name}</div>
                  <div className="detail-meta">
                    {[
                      r.trainee.course && r.trainee.course.name,
                      r.trainee.provider && r.trainee.provider.name,
                      r.trainee.daysSinceCertification != null && `Certified ${r.trainee.daysSinceCertification} days ago`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    <Badge variant="neutral">{r.trainee.currentStatusLabel}</Badge>
                  </div>
                </div>
                <div className="review-status">
                  <span className={cn('review-dot', reviewDotMod(r.reviewStatus.state))} />
                  {r.reviewStatus.label}
                </div>
              </div>

              <div className="section-title">Outcome Risk</div>
              <div className="risk-hero">
                <div className="risk-num" style={{ color: bandColor(r.outcomeRisk.band) }}>
                  {r.outcomeRisk.score}
                  <span className="of"> / 100</span>
                </div>
                <div>
                  <div className="risk-band">
                    <Badge variant={`outline-${bandTone(r.outcomeRisk.band)}`}>{cap(r.outcomeRisk.band)} risk</Badge>
                  </div>
                  {r.outcomeRisk.computedLabel && (
                    <div className="card-sub" style={{ margin: '6px 0 0' }}>{r.outcomeRisk.computedLabel}</div>
                  )}
                </div>
              </div>
              {r.outcomeRisk.factors.length > 0 ? (
                <div className="factor-list">
                  {r.outcomeRisk.factors.map((f, i) => (
                    <div className="factor" key={i}>
                      <span>{f.label}</span>
                      <span className="pts" style={{ color: 'var(--brick)' }}>
                        +{f.points}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="card-sub" style={{ margin: 0 }}>
                  No contributing factors triggered — this trainee's outcome risk is low.
                </p>
              )}

              {r.attritionRisk.score > 0 && (
                <>
                  <div className="section-title">Attrition Risk</div>
                  <div className="risk-hero">
                    <div className="risk-num" style={{ fontSize: 32, color: bandColor(r.attritionRisk.band) }}>
                      {r.attritionRisk.score}
                      <span className="of"> / 100</span>
                    </div>
                    <div className="risk-band">
                      <Badge variant={`outline-${bandTone(r.attritionRisk.band)}`}>{cap(r.attritionRisk.band)}</Badge>
                    </div>
                  </div>
                  {r.attritionRisk.factors.length > 0 && (
                    <div className="factor-list">
                      {r.attritionRisk.factors.map((f, i) => (
                        <div className="factor" key={i}>
                          <span>{f.label}</span>
                          <span className="pts" style={{ color: 'var(--ochre)' }}>
                            +{f.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {r.rootCause && (
                <>
                  <div className="section-title">Root Cause</div>
                  <div
                    className="card"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
                  >
                    <div>
                      <strong>{r.rootCause.displayLabel}</strong>
                      {r.skillMismatch && r.skillMismatch.source === 'course-target' && (
                        <span className="card-sub" style={{ display: 'inline' }}>
                          {' '}
                          — no employer/job data available yet
                        </span>
                      )}
                    </div>
                    <Badge variant="plum">
                      {r.rootCause.source === 'inferred' ? 'Inferred — needs confirmation' : 'Reported by trainee'}
                    </Badge>
                  </div>
                </>
              )}

              {r.skillMismatch && (
                <>
                  <div className="section-title">
                    Skill Mismatch — {r.skillMismatch.source === 'employment' ? 'Job Comparison' : 'Course Feedback'}
                  </div>
                  <div className="mismatch-grid">
                    <div className="card">
                      <div className="card-title">Course teaches</div>
                      {r.skillMismatch.courseSkills.map((s) => (
                        <span className="chip-skill present" key={s}>
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="card">
                      <div className="card-title">{r.skillMismatch.targetOccupation} requires</div>
                      {r.skillMismatch.requiredSkills.map((s) => (
                        <span className={cn('chip-skill', r.skillMismatch.matched.includes(s) && 'present')} key={s}>
                          {s}
                        </span>
                      ))}
                      {r.skillMismatch.missing.length > 0 ? (
                        <div className="card-sub" style={{ marginTop: 6 }}>
                          Missing: <strong style={{ color: 'var(--brick)' }}>{r.skillMismatch.missing.join(', ')}</strong>
                          {r.skillMismatch.cohortTopMissingSkill &&
                            r.skillMismatch.missing.includes(r.skillMismatch.cohortTopMissingSkill) &&
                            ' — most frequently missing skill in this cohort'}
                        </div>
                      ) : (
                        <div className="card-sub" style={{ marginTop: 6 }}>
                          All required skills are covered by the training.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="section-title">Recommended Intervention</div>
              {r.recommendedIntervention ? (
                <>
                  <InsightPanel label="System insight" basis={r.recommendedIntervention.basis}>
                    {r.recommendedIntervention.displayType} — {r.recommendedIntervention.rationale}
                  </InsightPanel>
                  <div style={{ marginTop: 8 }}>
                    <Badge variant={priorityVariant(r.priority)}>Priority: {cap(r.priority)}</Badge>
                  </div>
                  {r.reviewStatus.state === 'awaiting' ? (
                    <div className="action-row">
                      <Button variant="secondary" onClick={() => openModal('dismiss')} disabled={acting}>
                        Dismiss
                      </Button>
                      <Button variant="secondary" onClick={() => openModal('reassign')} disabled={acting}>
                        Reassign
                      </Button>
                      <Button variant="primary" onClick={() => openModal('approve')} disabled={acting}>
                        Approve intervention
                      </Button>
                    </div>
                  ) : (
                    <p className="card-sub" style={{ marginTop: 12 }}>
                      {r.reviewStatus.label}.
                      {r.reviewStatus.state === 'completed' && r.recommendedIntervention.outcomeNotes
                        ? ` ${r.recommendedIntervention.outcomeNotes}`
                        : ''}
                    </p>
                  )}
                </>
              ) : (
                <EmptyState message="No intervention recommended — this trainee is not currently flagged for action." />
              )}

              <div className="section-title">Case Notes</div>
              <div className="card">
                <div className="card-sub" style={{ marginBottom: 10 }}>
                  No case notes yet.
                </div>
                <Button variant="ghost" size="sm" onClick={() => openModal('note')}>
                  + Add note
                </Button>
              </div>

              <div style={{ marginTop: 18 }}>
                <Link
                  to={`/counsellor/trainee/${r.trainee.id}`}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}
                >
                  View full profile &amp; timeline →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={modal != null}
        onClose={closeModal}
        title={
          modal === 'approve'
            ? 'Approve intervention'
            : modal === 'dismiss'
              ? 'Dismiss recommendation'
              : modal === 'reassign'
                ? 'Reassign case'
                : 'Add case note'
        }
        footer={
          modal === 'approve' ? (
            <>
              <Button variant="secondary" onClick={closeModal} disabled={acting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={doApprove} loading={acting}>
                Approve intervention
              </Button>
            </>
          ) : modal === 'dismiss' ? (
            <>
              <Button variant="secondary" onClick={closeModal} disabled={acting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={doDismiss} loading={acting} disabled={!dismissReason.trim()}>
                Dismiss recommendation
              </Button>
            </>
          ) : modal === 'reassign' ? (
            <>
              <Button variant="secondary" onClick={closeModal} disabled={acting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={doReassign} loading={acting} disabled={!reassignTo}>
                Reassign
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closeModal}>
              Close
            </Button>
          )
        }
      >
        {modal === 'approve' && (
          <p style={{ margin: 0 }}>
            This creates the intervention record and sets its status to <strong>in progress</strong>. The review status
            updates immediately and is saved.
          </p>
        )}
        {modal === 'dismiss' && (
          <Input
            label="Reason for dismissing (required)"
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="e.g. trainee already enrolled in a bridge course"
          />
        )}
        {modal === 'reassign' && (
          <Select
            label="Assign to"
            size="field"
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            options={(r && r.assigneeOptions ? r.assigneeOptions : []).map((a) => ({
              value: a.id,
              label: `${a.name} (${a.role})`,
            }))}
          />
        )}
        {modal === 'note' && <p style={{ margin: 0 }}>Case notes will be available in a later step.</p>}
        {actionError && (
          <p className="card-sub" style={{ color: 'var(--brick)', marginTop: 10 }}>
            {actionError}
          </p>
        )}
      </Modal>
    </>
  );
}
