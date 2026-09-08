import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './profile.css';
import { useApi } from '../../hooks/useApi';
import { useSession } from '../../context/SessionContext';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Dropdown from '../../components/ui/Dropdown';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import Timeline from '../../components/Timeline';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const bandColor = (b) => (b === 'high' ? 'var(--brick)' : b === 'medium' ? 'var(--ochre)' : 'var(--teal)');
const smVariant = (b) => (b === 'good' ? 'outline-teal' : b === 'partial' ? 'outline-ochre' : 'outline-brick');
const smLabel = (b) => (b === 'good' ? 'Good match' : b === 'partial' ? 'Partial match' : 'Mismatch');
const smColor = (b) => (b === 'good' ? 'var(--teal)' : b === 'partial' ? 'var(--ochre)' : 'var(--brick)');

/* ---------- wage sparkline (Design System §17: 2px --ink line, teal when rising) ---------- */
function Sparkline({ series }) {
  if (!series || series.length < 2) return null;
  const w = 220;
  const h = 30;
  const amounts = series.map((s) => s.amountInr);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const span = max - min || 1;
  const pts = series.map((s, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((s.amountInr - min) / span) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const rising = amounts[amounts.length - 1] >= amounts[0];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={rising ? 'var(--teal)' : 'var(--brick)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- loading skeleton (matches the final shape) ---------- */
function ProfileSkeleton() {
  return (
    <>
      <Skeleton width="40%" height={13} />
      <div style={{ height: 14 }} />
      <div className="profile-header">
        <div className="ph-main">
          <Skeleton width={56} height={56} radius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="45%" height={26} />
            <div style={{ height: 10 }} />
            <Skeleton width="70%" height={12} />
          </div>
        </div>
      </div>
      <div className="layout">
        <div className="snapshot">
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="card" key={i}>
              <Skeleton width="55%" height={14} />
              <div style={{ height: 12 }} />
              <Skeleton height={54} />
            </div>
          ))}
        </div>
        <div>
          <Skeleton width="35%" height={19} />
          <div style={{ height: 18 }} />
          <Skeleton height={420} radius="var(--radius-md)" />
        </div>
      </div>
    </>
  );
}

/* ======================================================================== */
export default function TraineeProfile() {
  const { id } = useParams();
  const { role } = useSession();
  const { data, error, loading, reload } = useApi(`/trainees/${id}`);
  const [modal, setModal] = useState(null);

  const exportRecord = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.trainee.displayId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useTopbarActions(
    data ? (
      <Button variant="secondary" onClick={exportRecord}>
        Export record
      </Button>
    ) : null,
    [!!data, id],
  );

  if (error) {
    return <ErrorState message="Couldn't load this trainee's record. Retry." onRetry={reload} />;
  }
  if (loading && !data) return <ProfileSkeleton />;
  if (!data) return null;

  const t = data.trainee;
  const emp = data.currentEmployment;
  const wp = data.wageProgression;
  const sm = data.skillMatch;

  const dirTo = role === 'counsellor' ? '/counsellor/trainees' : '/provider/trainees';
  const crumbRoot =
    role === 'counsellor'
      ? { to: '/counsellor/worklist', label: 'Risk & Intervention Center' }
      : { to: '/provider/dashboard', label: 'Provider Dashboard' };

  const provenance =
    emp && emp.verificationStatus === 'confirmed'
      ? 'verified'
      : emp && emp.verificationStatus === 'disputed'
        ? 'needs_review'
        : emp
          ? 'self_reported'
          : undefined;

  const metaLine = [
    emp && emp.occupation,
    emp && emp.employerName,
    t.course && t.course.name,
    t.provider && t.provider.name,
    `${t.district} district`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const verifBadge = emp
    ? emp.verificationStatus === 'confirmed'
      ? { variant: 'solid-teal', text: '● Verified' }
      : emp.verificationStatus === 'disputed'
        ? { variant: 'dashed-brick', text: 'Needs review' }
        : emp.verificationStatus === 'pending'
          ? { variant: 'neutral', text: 'Pending' }
          : { variant: 'neutral', text: 'Not sent' }
    : null;

  const sendVerifDisabled = emp && emp.verificationStatus === 'pending';

  const actionButtons = (
    <>
      <Button
        variant="secondary"
        disabled={sendVerifDisabled}
        onClick={() => setModal('verify')}
      >
        {sendVerifDisabled ? 'Verification pending' : 'Send verification request'}
      </Button>
      <Button variant="secondary" onClick={() => setModal('note')}>
        Log case note
      </Button>
      <Button variant="primary" onClick={() => setModal('message')}>
        Message trainee
      </Button>
    </>
  );

  return (
    <>
      <div className="crumbline">
        <Link to={crumbRoot.to}>{crumbRoot.label}</Link>
        &nbsp;/&nbsp;
        <Link to={dirTo}>Trainee Profiles</Link>
        &nbsp;/&nbsp; {t.name}
      </div>

      <div className="profile-header">
        <div className="ph-main">
          <div className="avatar">{t.initials}</div>
          <div>
            <div className="ph-name-row">
              <span className="ph-name">{t.name}</span>
              <StatusBadge status={t.currentStatus} provenance={provenance} confidence={t.currentConfidence} />
              <Badge variant="neutral">Confidence: {t.currentConfidenceLabel}</Badge>
            </div>
            <div className="ph-meta">{metaLine}</div>
            <div className="ph-id">
              {t.displayId} · Batch {t.batchId}
              {t.training.daysSinceCertification != null
                ? ` · Certified ${t.training.daysSinceCertification} days ago`
                : ''}
            </div>
          </div>
        </div>
        <div className="ph-actions">{actionButtons}</div>
        <div className="ph-actions-overflow">
          <Dropdown
            label="Actions"
            align="end"
            items={[
              { label: sendVerifDisabled ? 'Verification pending' : 'Send verification request', disabled: sendVerifDisabled, onSelect: () => setModal('verify') },
              { label: 'Log case note', onSelect: () => setModal('note') },
              { label: 'Message trainee', onSelect: () => setModal('message') },
              { separator: true },
              { label: 'Export record', onSelect: exportRecord },
            ]}
          />
        </div>
      </div>

      <div className="layout">
        {/* ---------------- SNAPSHOT ---------------- */}
        <div className="snapshot">
          {emp ? (
            <Card title="Current employment">
              <div className="snap-row">
                <span className="sk">Employer</span>
                <span className="sv">{emp.employerName}</span>
              </div>
              <div className="snap-row">
                <span className="sk">Role</span>
                <span className="sv">{emp.occupation}</span>
              </div>
              <div className="snap-row">
                <span className="sk">Since</span>
                <span className="sv">{emp.sinceDays} days ago</span>
              </div>
              <div className="snap-row">
                <span className="sk">Verification</span>
                <span className="sv">
                  <Badge variant={verifBadge.variant}>{verifBadge.text}</Badge>
                </span>
              </div>
              <div className="snap-row">
                <span className="sk">Job changes</span>
                <span className="sv">
                  {data.jobChanges}
                  {data.jobChanges > 0 && t.currentStatus === 'employed' ? ' (re-employed)' : ''}
                </span>
              </div>
            </Card>
          ) : (
            <Card title="Current status">
              <div className="snap-row">
                <span className="sk">Status</span>
                <span className="sv">{t.currentStatusLabel}</span>
              </div>
              <div className="snap-row">
                <span className="sk">Since certification</span>
                <span className="sv">{t.training.daysSinceCertification} days</span>
              </div>
              {data.rootCauses[0] && (
                <div className="snap-row">
                  <span className="sk">Root cause</span>
                  <span className="sv">{data.rootCauses[0].displayLabel}</span>
                </div>
              )}
            </Card>
          )}

          {wp && (
            <Card title="Wage progression">
              <div className="snap-hero">
                <span className="num">{inr(wp.latest)}</span>
                {wp.growthPct != null && (
                  <span
                    className="delta"
                    style={{ color: wp.growthPct >= 0 ? 'var(--teal)' : 'var(--brick)' }}
                  >
                    {wp.growthPct >= 0 ? '▲' : '▼'} {Math.abs(wp.growthPct)}%
                  </span>
                )}
              </div>
              <div className="card-sub" style={{ marginBottom: 0 }}>
                from {inr(wp.baseline)} baseline · {wp.checkpointsCount} checkpoints recorded
              </div>
              <Sparkline series={wp.series} />
            </Card>
          )}

          {sm && (
            <Card title="Skill relevance">
              <div className="snap-hero">
                <span className="num">{sm.score}%</span>
                <Badge variant={smVariant(sm.band)}>{smLabel(sm.band)}</Badge>
              </div>
              <div className="gauge-track">
                <div style={{ width: `${sm.score}%`, height: '100%', background: smColor(sm.band) }} />
              </div>
              <div className="card-sub" style={{ marginTop: 8, marginBottom: 0 }}>
                {sm.missingSkills.length
                  ? `Missing: ${sm.missingSkills.join(', ')}`
                  : `No missing skills for ${sm.occupation || 'this role'}`}
              </div>
              {sm.bridgeSuggestions && sm.bridgeSuggestions.length > 0 && (
                <div className="card-sub" style={{ marginTop: 4, marginBottom: 0 }}>
                  Recommended: {sm.bridgeSuggestions.join(', ')}
                </div>
              )}
            </Card>
          )}

          <RiskCard outcome={t.outcomeRisk} attrition={t.attritionRisk} />

          <Card title="Consent">
            {data.consent.map((c) => (
              <div className="consent-item" key={c.purpose}>
                <span>
                  <span
                    className="consent-dot"
                    style={{ background: c.granted ? 'var(--teal)' : 'var(--slate-30)' }}
                  />
                  {c.displayLabel}
                </span>
                <span>{c.granted ? 'Granted' : 'Not granted'}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* ---------------- TIMELINE ---------------- */}
        <div>
          <Timeline timeline={data.timeline} />
        </div>
      </div>

      <Modal
        open={modal != null}
        onClose={() => setModal(null)}
        title={
          modal === 'verify'
            ? 'Send verification request'
            : modal === 'note'
              ? 'Log case note'
              : 'Message trainee'
        }
        footer={
          <Button variant="secondary" onClick={() => setModal(null)}>
            Close
          </Button>
        }
      >
        <p style={{ margin: 0 }}>
          This action will be available in a later step. The trainee profile is read-only for now.
        </p>
      </Modal>
    </>
  );
}

function RiskCard({ outcome, attrition }) {
  const [open, setOpen] = useState(false);
  const factors = (outcome && outcome.factors) || [];
  return (
    <Card title="Risk">
      <div className="snap-row">
        <span className="sk">Outcome risk</span>
        <span className="sv" style={{ color: bandColor(outcome.band) }}>
          {outcome.score} / 100 · {cap(outcome.band)}
        </span>
      </div>
      <div className="snap-row">
        <span className="sk">Attrition risk</span>
        <span className="sv" style={{ color: bandColor(attrition.band) }}>
          {attrition.score} / 100 · {cap(attrition.band)}
        </span>
      </div>
      {factors.length > 0 && (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm t-expand-btn"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide factors' : 'View factors'}
          </button>
          {open && (
            <div className="t-expand">
              <div className="t-expand-title">Outcome risk factors</div>
              {factors.map((f, i) => (
                <div className="t-expand-row" key={i}>
                  <span className="k">{f.label}</span>
                  <span className="v" style={{ color: 'var(--brick)' }}>
                    +{f.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
