import { Link } from 'react-router-dom';
import './my-career.css';
import { useApi } from '../../hooks/useApi';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import Timeline from '../../components/Timeline';
import { inr, pct, fmtDate } from '../../lib/format';

const smColor = (b) => (b === 'good' ? 'var(--teal)' : b === 'partial' ? 'var(--ochre)' : 'var(--brick)');
const smLabel = (b) => (b === 'good' ? 'Good match' : b === 'partial' ? 'Partial match' : 'Mismatch');

export default function TraineeHome() {
  const trainee = useScopedEntity('trainee');
  const { data, error, loading, reload } = useApi(trainee.id ? `/trainees/${trainee.id}` : null);

  useTopbarActions(trainee.Switcher, [trainee.id]);

  if (trainee.error || error) {
    return <ErrorState message="Couldn't load your record. Retry." onRetry={reload} />;
  }
  if ((loading && !data) || (trainee.loading && !trainee.id)) {
    return (
      <>
        <Card><Skeleton height={70} /></Card>
        <div style={{ height: 20 }} />
        <div className="mc-grid"><Card><Skeleton height={110} /></Card><Card><Skeleton height={110} /></Card><Card><Skeleton height={110} /></Card></div>
      </>
    );
  }
  if (!data) return null;

  const t = data.trainee;
  const emp = data.currentEmployment;
  const wp = data.wageProgression;
  const sm = data.skillMatch;
  const nextFollowup = data.followups?.nextScheduled;
  const openRec = (data.interventions || []).find((i) => i.status === 'recommended' || i.status === 'in_progress');
  const rootCause = (data.rootCauses || [])[0];

  const nextActions = [];
  if (nextFollowup) {
    nextActions.push({
      text: `Your day-${nextFollowup.checkpointDay} check-in is scheduled for ${fmtDate(nextFollowup.scheduledDate)}.`,
      to: '/trainee/followups',
      cta: 'Go to follow-ups',
    });
  }
  if (openRec) {
    nextActions.push({
      text: `${openRec.displayType}${openRec.rationale ? ` — ${openRec.rationale}` : ''}`,
      to: '/trainee/timeline',
      cta: 'See on timeline',
    });
  }
  if (sm && sm.missingSkills && sm.missingSkills.length) {
    nextActions.push({
      text: `Strengthen ${sm.missingSkills.join(', ')} to close the gap for ${sm.occupation || 'your role'}.`,
      to: '/trainee/timeline',
      cta: 'View skill relevance',
    });
  }
  if (!nextActions.length) {
    nextActions.push({ text: 'You are on track — keep responding to your check-ins so your record stays current.', to: '/trainee/followups', cta: 'View follow-ups' });
  }

  return (
    <>
      {/* summary */}
      <Card className="mc-summary">
        <div className="mc-summary-main">
          <div className="mc-avatar">{t.initials}</div>
          <div>
            <div className="mc-name-row">
              <span className="mc-name">{t.name}</span>
              <StatusBadge status={t.currentStatus} confidence={t.currentConfidence} />
            </div>
            <div className="mc-meta">
              {[t.course && t.course.name, t.provider && t.provider.name, `${t.district} district`].filter(Boolean).join('  ·  ')}
            </div>
            <div className="mc-meta" style={{ marginTop: 4 }}>
              {t.training.certified
                ? `Certified ${t.training.daysSinceCertification} days ago · attendance ${t.training.attendancePct}% · assessment ${t.training.assessmentScore}%`
                : 'In training'}
            </div>
          </div>
        </div>
        <Link to="/trainee/timeline" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          View full career timeline
        </Link>
      </Card>

      {/* where you are now */}
      <div className="mc-grid">
        <Card title="Where you are now">
          {emp ? (
            <>
              <div className="mc-fact"><span>Employer</span><strong>{emp.employerName}</strong></div>
              <div className="mc-fact"><span>Role</span><strong>{emp.occupation}</strong></div>
              <div className="mc-fact"><span>Since</span><strong>{emp.sinceDays} days ago</strong></div>
              <div className="mc-fact">
                <span>Verification</span>
                <Badge variant={emp.verificationStatus === 'confirmed' ? 'solid-teal' : emp.verificationStatus === 'disputed' ? 'dashed-brick' : 'neutral'}>
                  {emp.verificationStatus === 'confirmed' ? 'Verified' : emp.verificationStatus === 'disputed' ? 'Needs review' : 'Pending'}
                </Badge>
              </div>
            </>
          ) : (
            <>
              <div className="mc-fact"><span>Status</span><strong>{t.currentStatusLabel}</strong></div>
              {rootCause && <div className="mc-fact"><span>Main reason</span><strong>{rootCause.displayLabel}</strong></div>}
              <p className="dash-note" style={{ marginTop: 8 }}>Your training provider and counsellor can help you find a placement.</p>
            </>
          )}
        </Card>

        <Card title="Income progression">
          {wp ? (
            <>
              <div className="mc-hero">
                <span className="mc-hero-num">{inr(wp.latest)}</span>
                {wp.growthPct != null && (
                  <span className="mc-hero-delta" style={{ color: wp.growthPct >= 0 ? 'var(--teal)' : 'var(--brick)' }}>
                    {wp.growthPct >= 0 ? '▲' : '▼'} {Math.abs(wp.growthPct)}%
                  </span>
                )}
              </div>
              <p className="dash-note">from {inr(wp.baseline)} baseline · {wp.checkpointsCount} checkpoints</p>
            </>
          ) : (
            <EmptyState message="No income has been recorded yet." />
          )}
        </Card>

        <Card title="Skill match">
          {sm ? (
            <>
              <div className="mc-hero">
                <span className="mc-hero-num">{sm.score}%</span>
                <Badge variant={sm.band === 'good' ? 'outline-teal' : sm.band === 'partial' ? 'outline-ochre' : 'outline-brick'}>
                  {smLabel(sm.band)}
                </Badge>
              </div>
              <div className="gauge-track" style={{ height: 6, background: 'var(--slate-10)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ width: `${sm.score}%`, height: '100%', background: smColor(sm.band) }} />
              </div>
              <p className="dash-note">
                {sm.missingSkills && sm.missingSkills.length
                  ? `Missing: ${sm.missingSkills.join(', ')}`
                  : `No missing skills for ${sm.occupation || 'your role'}`}
              </p>
              {sm.bridgeSuggestions && sm.bridgeSuggestions.length > 0 && (
                <p className="dash-note">Recommended: {sm.bridgeSuggestions.join(', ')}</p>
              )}
            </>
          ) : (
            <EmptyState message="A skill match is calculated once you report employment." />
          )}
        </Card>
      </div>

      {/* recommended next actions */}
      <Card title="Recommended next steps">
        {nextActions.map((a, i) => (
          <div className="dash-list-row" key={i}>
            <span style={{ paddingRight: 12 }}>{a.text}</span>
            <Link to={a.to} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {a.cta}
            </Link>
          </div>
        ))}
      </Card>

      {/* consent + follow-up status */}
      <div className="dash-grid-2">
        <Card title="Follow-up status">
          <div className="mc-fact"><span>Response rate</span><strong>{pct(data.followups?.responseRate)}</strong></div>
          <div className="mc-fact"><span>Last response</span><strong>{data.followups?.lastResponseDate ? fmtDate(data.followups.lastResponseDate) : '—'}</strong></div>
          <div className="mc-fact">
            <span>Next check-in</span>
            <strong>{nextFollowup ? `Day ${nextFollowup.checkpointDay} · ${fmtDate(nextFollowup.scheduledDate)}` : 'None scheduled'}</strong>
          </div>
          <div className="dash-note" style={{ marginTop: 8 }}>
            <Link to="/trainee/followups" style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>Answer a check-in →</Link>
          </div>
        </Card>
        <Card title="Your consent">
          {(data.consent || []).map((c) => (
            <div className="mc-fact" key={c.purpose}>
              <span>{c.displayLabel}</span>
              <Badge variant={c.granted ? 'outline-teal' : 'neutral'}>{c.granted ? 'Granted' : 'Not granted'}</Badge>
            </div>
          ))}
          <div className="dash-note" style={{ marginTop: 8 }}>
            <Link to="/trainee/consent" style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>Manage consent →</Link>
          </div>
        </Card>
      </div>

      {/* timeline */}
      <Card>
        <Timeline timeline={data.timeline} title="Your career timeline" />
      </Card>
    </>
  );
}
