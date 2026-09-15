import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { apiSend } from '../../api/client';
import { useSession } from '../../context/SessionContext';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Alert from '../../components/ui/Alert';
import StatusBadge from '../../components/ui/StatusBadge';
import RiskBadge from '../../components/ui/RiskBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['in_training', 'In training'],
  ['employed', 'Employed'],
  ['self_employed', 'Self-employed'],
  ['apprentice', 'Apprentice'],
  ['unemployed', 'Unemployed'],
  ['job_lost', 'Job lost'],
  ['not_responding', 'Not responding'],
  ['certified_no_outcome', 'Certified — no outcome'],
  ['dropped_out', 'Dropped out'],
];
const RISK_OPTIONS = [
  ['', 'All risk'],
  ['high', 'High'],
  ['medium', 'Medium'],
  ['low', 'Low'],
];

const EMPTY_FORM = {
  name: '', contact: '', district: '', providerId: '', courseId: '', batchId: '',
  attendancePct: '', assessmentScore: '', completionStatus: 'completed',
  skills: [], extraSkill: '', gender: 'undisclosed', ageBand: '18-24',
};

const COMPLETION_OPTIONS = [
  { value: 'completed', label: 'Completed & certified' },
  { value: 'in_training', label: 'Still in training' },
  { value: 'dropped_out', label: 'Dropped out' },
];

export default function TraineeDirectory() {
  const { role } = useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [risk, setRisk] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);

  const params = useMemo(
    () => ({ status: status || undefined, risk: risk || undefined }),
    [status, risk],
  );
  const { data, error, loading, reload } = useApi('/trainees', params);
  const providersApi = useApi('/providers');
  const coursesApi = useApi('/courses');
  const providers = providersApi.data?.providers || [];
  const allCourses = coursesApi.data?.courses || [];
  const coursesForProvider = form.providerId
    ? allCourses.filter((c) => c.providerId === form.providerId)
    : allCourses;

  const base = role === 'counsellor' ? '/counsellor/trainee/' : '/provider/trainee/';

  useTopbarActions(
    <>
      <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
        {STATUS_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <select className="select" value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Risk band">
        {RISK_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </>,
    [status, risk],
  );

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setToast(null);
    setModalOpen(true);
  };
  const closeModal = () => { if (!busy) setModalOpen(false); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // picking a course pre-fills the skills list with what that course teaches
  const pickCourse = (courseId) => {
    const c = allCourses.find((x) => x.id === courseId);
    setForm((f) => ({ ...f, courseId, skills: c ? [...(c.skillTags || [])] : f.skills }));
  };
  const toggleSkill = (s) =>
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));
  const addExtraSkill = () => {
    const s = form.extraSkill.trim();
    if (!s) return;
    setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills : [...f.skills, s], extraSkill: '' }));
  };
  const courseTags = (allCourses.find((c) => c.id === form.courseId) || {}).skillTags || [];
  const allSkillChoices = [...new Set([...courseTags, ...form.skills])];

  const submit = async () => {
    const required = ['name', 'contact', 'district', 'providerId', 'courseId', 'batchId'];
    const missing = required.filter((k) => !String(form[k] || '').trim());
    if (missing.length) { setFormError('Please fill in name, contact, district, provider, course and batch.'); return; }
    setBusy(true);
    setFormError(null);
    try {
      const r = await apiSend('POST', '/trainees', {
        name: form.name.trim(),
        contact: form.contact.trim(),
        district: form.district.trim(),
        providerId: form.providerId,
        courseId: form.courseId,
        batchId: form.batchId.trim(),
        attendancePct: form.attendancePct || undefined,
        assessmentScore: form.assessmentScore || undefined,
        completionStatus: form.completionStatus,
        skills: form.skills,
        gender: form.gender,
        ageBand: form.ageBand,
        actorRole: role || 'provider',
      });
      setModalOpen(false);
      setToast(`${form.name.trim()} added.`);
      reload();
      if (r.trainee?.id) navigate(base + r.trainee.id);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message="Couldn't load the trainee list. Retry." onRetry={reload} />;

  if (loading && !data) {
    return (
      <Card title="Trainees">
        <Skeleton height={40} />
        <div style={{ height: 8 }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton height={44} />
            <div style={{ height: 6 }} />
          </div>
        ))}
      </Card>
    );
  }
  if (!data) return null;

  return (
    <>
      {toast && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="positive" title="Saved" action={<Button variant="ghost" size="sm" onClick={() => setToast(null)}>Dismiss</Button>}>
            {toast}
          </Alert>
        </div>
      )}

      <Card>
        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="card-title">Trainees</div>
            <div className="card-sub" style={{ marginBottom: 0 }}>{data.count} tracked · sorted by outcome risk</div>
          </div>
          <Button variant="primary" onClick={openModal}>New trainee</Button>
        </div>

        {data.trainees.length === 0 ? (
          <EmptyState message="No trainees match this filter." />
        ) : (
          <Table wrap>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Course</Table.HeadCell>
                <Table.HeadCell>District</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell numeric>Outcome risk</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {data.trainees.map((t) => (
                <Table.Row key={t.id} onClick={() => navigate(base + t.id)}>
                  <Table.Cell>{t.name}</Table.Cell>
                  <Table.Cell>{t.course}</Table.Cell>
                  <Table.Cell>{t.district}</Table.Cell>
                  <Table.Cell>
                    <StatusBadge status={t.currentStatus} confidence={t.currentConfidence} />
                  </Table.Cell>
                  <Table.Cell numeric>
                    <RiskBadge score={t.outcomeRisk.score} band={t.outcomeRisk.band} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Register a new trainee"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={busy}>Add trainee</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Full name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Anita Kumari" />
          <Input label="Contact number" value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder="10-digit mobile" />
          <Input label="District" value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="e.g. Ranchi" />
          <Select label="Training provider" size="field" value={form.providerId}
            onChange={(e) => set('providerId', e.target.value)}
            options={[{ value: '', label: providersApi.loading ? 'Loading…' : 'Select a provider' }, ...providers.map((p) => ({ value: p.id, label: p.name }))]} />
          <Select label="Course (skill trained in)" size="field" value={form.courseId}
            onChange={(e) => pickCourse(e.target.value)}
            options={[{ value: '', label: coursesApi.loading ? 'Loading…' : 'Select a course' }, ...coursesForProvider.map((c) => ({ value: c.id, label: c.name }))]} />
          <Input label="Batch ID" value={form.batchId} onChange={(e) => set('batchId', e.target.value)} placeholder="e.g. RET-2026-C" />
          <Select label="Completion status" size="field" value={form.completionStatus}
            onChange={(e) => set('completionStatus', e.target.value)} options={COMPLETION_OPTIONS} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Attendance %" type="number" value={form.attendancePct} onChange={(e) => set('attendancePct', e.target.value)} placeholder="0–100" />
            <Input label="Assessment score %" type="number" value={form.assessmentScore} onChange={(e) => set('assessmentScore', e.target.value)} placeholder="0–100" />
          </div>

          <div className="field">
            <label className="field-label">Skills this trainee has been trained in</label>
            {form.courseId ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allSkillChoices.map((s) => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input type="checkbox" checked={form.skills.includes(s)} onChange={() => toggleSkill(s)} />
                      {s}{!courseTags.includes(s) && <span className="dash-note" style={{ marginTop: 0 }}> (added)</span>}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Input value={form.extraSkill} onChange={(e) => set('extraSkill', e.target.value)}
                    placeholder="Add another skill (e.g. Spoken English)"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtraSkill(); } }} />
                  <Button variant="secondary" onClick={addExtraSkill}>Add</Button>
                </div>
                <span className="dash-note">Pre-filled from the course. Untick any the trainee didn’t actually pick up.</span>
              </>
            ) : (
              <span className="dash-note">Select a course first — its skills pre-fill here.</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Select label="Gender" size="field" value={form.gender} onChange={(e) => set('gender', e.target.value)}
              options={[
                { value: 'undisclosed', label: 'Undisclosed' },
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
                { value: 'other', label: 'Other' },
              ]} />
            <Select label="Age band" size="field" value={form.ageBand} onChange={(e) => set('ageBand', e.target.value)}
              options={[
                { value: '18-24', label: '18–24' },
                { value: '25-34', label: '25–34' },
                { value: '35-44', label: '35–44' },
                { value: '45+', label: '45+' },
              ]} />
          </div>
          <p className="card-sub" style={{ margin: 0 }}>
            {form.completionStatus === 'completed'
              ? 'Records certification as today, schedules a day-30 follow-up, and grants data-collection consent.'
              : form.completionStatus === 'in_training'
                ? 'Status will show as “In training”. A day-30 follow-up is still scheduled.'
                : 'Status will show as “Dropped out”. No follow-up is scheduled.'}
            {' '}Appears in directories, dashboards and analytics immediately.
          </p>
          {formError && <p className="card-sub" style={{ color: 'var(--brick)', margin: 0 }}>{formError}</p>}
        </div>
      </Modal>
    </>
  );
}
