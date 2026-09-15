import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './profile.css';
import { useApi } from '../../hooks/useApi';
import { apiSend } from '../../api/client';
import { useSession } from '../../context/SessionContext';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Dropdown from '../../components/ui/Dropdown';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Alert from '../../components/ui/Alert';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import Timeline from '../../components/Timeline';
import SkillIntel from '../../components/SkillIntel';

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
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);
  const [empForm, setEmpForm] = useState({ employerName: '', occupation: '', kind: 'employment', startDate: '', monthlyIncome: '', requestVerification: true });
  const [incForm, setIncForm] = useState({ amountInr: '', checkpointDay: '90' });
  const [followNote, setFollowNote] = useState('');

  const openModal = (m) => {
    setFormError(null);
    setToast(null);
    if (m === 'employment') setEmpForm({ employerName: '', occupation: '', kind: 'employment', startDate: '', monthlyIncome: '', requestVerification: true });
    if (m === 'income') setIncForm({ amountInr: '', checkpointDay: '90' });
    if (m === 'follow') setFollowNote('');
    setModal(m);
  };
  const closeModal = () => { if (!busy) setModal(null); };

  const submitEmployment = async () => {
    if (!empForm.employerName.trim() || !empForm.occupation.trim()) { setFormError('Employer and role are required.'); return; }
    setBusy(true); setFormError(null);
    try {
      const r = await apiSend('POST', `/trainees/${id}/employment`, {
        employerName: empForm.employerName.trim(),
        occupation: empForm.occupation.trim(),
        kind: empForm.kind,
        startDate: empForm.startDate || undefined,
        monthlyIncome: empForm.monthlyIncome || undefined,
        requestVerification: empForm.kind === 'employment' && empForm.requestVerification,
        actorRole: role || 'provider',
      });
      setModal(null);
      setToast(`Employment at ${empForm.employerName.trim()} recorded${r.verificationRequested ? ' · verification request sent' : ''}.`);
      reload();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  };

  const submitIncome = async () => {
    if (!incForm.amountInr || Number(incForm.amountInr) <= 0) { setFormError('Enter a monthly amount in ₹.'); return; }
    setBusy(true); setFormError(null);
    try {
      await apiSend('POST', `/trainees/${id}/income`, {
        amountInr: Number(incForm.amountInr),
        checkpointDay: Number(incForm.checkpointDay),
        actorRole: role || 'provider',
      });
      setModal(null);
      setToast(`Income checkpoint (day ${incForm.checkpointDay}) recorded.`);
      reload();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  };

  const submitFollow = async () => {
    setBusy(true); setFormError(null);
    try {
      await apiSend('POST', '/followups', {
        traineeId: id,
        note: followNote.trim() || undefined,
        requestedByRole: role === 'counsellor' ? 'counsellor' : 'provider',
      });
      setModal(null);
      setToast('Follow-up request sent — it now shows as due in the trainee’s follow-ups.');
      reload();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  };

  const submitVerification = async () => {
    setBusy(true); setFormError(null);
    try {
      const r = await apiSend('POST', `/trainees/${id}/verification-request`, { actorRole: role || 'provider' });
      setModal(null);
      setToast(r.alreadyPending ? 'A verification request is already pending for this job.' : 'Verification request sent to the employer.');
      reload();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  };

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

  const sendVerifDisabled = !emp || emp.verificationStatus === 'pending' || emp.verificationStatus === 'confirmed';

  const actionButtons = (
    <>
      <Button variant="secondary" onClick={() => openModal('follow')}>
        Request follow-up
      </Button>
      <Button variant="secondary" onClick={() => openModal('income')}>
        Record income
      </Button>
      <Button variant="primary" onClick={() => openModal('employment')}>
        Add employment
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
              { label: 'Add employment', onSelect: () => openModal('employment') },
              { label: 'Record income', onSelect: () => openModal('income') },
              { label: 'Request follow-up', onSelect: () => openModal('follow') },
              {
                label: sendVerifDisabled
                  ? (emp && emp.verificationStatus === 'confirmed' ? 'Employment verified' : emp ? 'Verification pending' : 'No active job to verify')
                  : 'Send verification request',
                disabled: sendVerifDisabled,
                onSelect: () => openModal('verify'),
              },
              { separator: true },
              { label: 'Export record', onSelect: exportRecord },
            ]}
          />
        </div>
      </div>

      {toast && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            tone="positive"
            title="Saved"
            action={
              <Button variant="ghost" size="sm" onClick={() => setToast(null)}>
                Dismiss
              </Button>
            }
          >
            {toast}
          </Alert>
        </div>
      )}

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

          {data.counsellor && (
            <Card title="Assigned counsellor">
              <div className="snap-row"><span className="sk">Name</span><span className="sv">{data.counsellor.name}</span></div>
              {data.counsellor.phone && <div className="snap-row"><span className="sk">Phone</span><span className="sv">{data.counsellor.phone}</span></div>}
              {data.counsellor.availability && <div className="snap-row"><span className="sk">Available</span><span className="sv">{data.counsellor.availability}</span></div>}
            </Card>
          )}
        </div>

        {/* ---------------- TIMELINE ---------------- */}
        <div>
          <Timeline timeline={data.timeline} />
        </div>
      </div>

      {data.skillIntel && (
        <Card style={{ marginTop: 20 }}>
          <SkillIntel intel={data.skillIntel} />
        </Card>
      )}

      <Modal
        open={modal != null}
        onClose={closeModal}
        title={
          modal === 'employment' ? 'Add employment record'
            : modal === 'income' ? 'Record income checkpoint'
              : modal === 'follow' ? 'Request a follow-up check-in'
                : 'Send verification request'
        }
        footer={
          modal === 'employment' ? (
            <>
              <Button variant="secondary" onClick={closeModal} disabled={busy}>Cancel</Button>
              <Button variant="primary" onClick={submitEmployment} loading={busy}>Save employment</Button>
            </>
          ) : modal === 'income' ? (
            <>
              <Button variant="secondary" onClick={closeModal} disabled={busy}>Cancel</Button>
              <Button variant="primary" onClick={submitIncome} loading={busy}>Save checkpoint</Button>
            </>
          ) : modal === 'follow' ? (
            <>
              <Button variant="secondary" onClick={closeModal} disabled={busy}>Cancel</Button>
              <Button variant="primary" onClick={submitFollow} loading={busy}>Send request</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={closeModal} disabled={busy}>Cancel</Button>
              <Button variant="primary" onClick={submitVerification} loading={busy}>Send request</Button>
            </>
          )
        }
      >
        {modal === 'employment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Employer / business name" value={empForm.employerName}
              onChange={(e) => setEmpForm((f) => ({ ...f, employerName: e.target.value }))} placeholder="e.g. BrightRetail Pvt Ltd" />
            <Input label="Role / occupation" value={empForm.occupation}
              onChange={(e) => setEmpForm((f) => ({ ...f, occupation: e.target.value }))} placeholder="e.g. Sales Associate" />
            <Select label="Type" size="field" value={empForm.kind}
              onChange={(e) => setEmpForm((f) => ({ ...f, kind: e.target.value }))}
              options={[
                { value: 'employment', label: 'Employment' },
                { value: 'self_employment', label: 'Self-employment' },
                { value: 'apprenticeship', label: 'Apprenticeship' },
              ]} />
            <Input label="Start date" type="date" value={empForm.startDate}
              onChange={(e) => setEmpForm((f) => ({ ...f, startDate: e.target.value }))} helperText="Leave blank for today" />
            <Input label="Monthly income (₹, optional)" type="number" value={empForm.monthlyIncome}
              onChange={(e) => setEmpForm((f) => ({ ...f, monthlyIncome: e.target.value }))} placeholder="e.g. 12000" />
            {empForm.kind === 'employment' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={empForm.requestVerification}
                  onChange={(e) => setEmpForm((f) => ({ ...f, requestVerification: e.target.checked }))} />
                Also send an employer verification request
              </label>
            )}
            <p className="card-sub" style={{ margin: 0 }}>
              This adds the job to the career timeline, updates the trainee’s current status, and refreshes every dashboard.
            </p>
          </div>
        )}

        {modal === 'income' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label="Monthly income (₹)" type="number" value={incForm.amountInr}
              onChange={(e) => setIncForm((f) => ({ ...f, amountInr: e.target.value }))} placeholder="e.g. 13500" />
            <Select label="Checkpoint" size="field" value={incForm.checkpointDay}
              onChange={(e) => setIncForm((f) => ({ ...f, checkpointDay: e.target.value }))}
              options={[
                { value: '0', label: 'Baseline (day 0)' },
                { value: '30', label: 'Day 30' },
                { value: '90', label: 'Day 90' },
                { value: '180', label: 'Day 180' },
                { value: '365', label: 'Day 365' },
              ]} />
            <p className="card-sub" style={{ margin: 0 }}>
              Feeds the wage-progression sparkline and the wage-growth KPIs.
            </p>
          </div>
        )}

        {modal === 'follow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              Ask <strong>{t.name}</strong> to complete a check-in now. It appears immediately as <strong>Due</strong> in their
              Follow-ups; when they answer, the response lands on this timeline.
            </p>
            <Input label="Note to the trainee (optional)" multiline rows={3} value={followNote}
              onChange={(e) => setFollowNote(e.target.value)} placeholder="e.g. Please confirm your current employer and salary." />
          </div>
        )}

        {modal === 'verify' && (
          <p style={{ margin: 0, fontSize: 13 }}>
            Send a verification request to <strong>{emp ? emp.employerName : 'the employer'}</strong> for the current role
            {emp ? ` (${emp.occupation})` : ''}. They receive a link to confirm or dispute it.
          </p>
        )}

        {formError && (
          <p className="card-sub" style={{ color: 'var(--brick)', marginTop: 12 }}>{formError}</p>
        )}
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
