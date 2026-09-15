import { useState } from 'react';
import { apiSend } from '../api/client';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

/**
 * Trainee raises a request to their course counsellor or their provider.
 * props: open, onClose, traineeId, counsellorName?, onCreated(request)
 */
const CATEGORIES = [
  { value: 'counselling', label: 'Counselling / guidance' },
  { value: 'placement_help', label: 'Help finding a job' },
  { value: 'skill_support', label: 'Skill / bridge-course support' },
  { value: 'record_update', label: 'Update my record' },
  { value: 'grievance', label: 'Grievance' },
  { value: 'other', label: 'Other' },
];

export default function RaiseRequestModal({ open, onClose, traineeId, counsellorName, onCreated }) {
  const [toRole, setToRole] = useState('counsellor');
  const [category, setCategory] = useState('counselling');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const reset = () => { setToRole('counsellor'); setCategory('counselling'); setSubject(''); setMessage(''); setErr(null); };
  const close = () => { if (!busy) { reset(); onClose(); } };

  const submit = async () => {
    if (!subject.trim() || !message.trim()) { setErr('Add a subject and a message.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await apiSend('POST', '/requests', {
        traineeId, toRole, category, subject: subject.trim(), message: message.trim(),
      });
      reset();
      onClose();
      onCreated?.(r.request);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Raise a request"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={busy}>Send request</Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Select label="Send to" size="field" value={toRole} onChange={(e) => setToRole(e.target.value)}
          options={[
            { value: 'counsellor', label: counsellorName ? `My counsellor (${counsellorName})` : 'My counsellor' },
            { value: 'provider', label: 'My training provider' },
          ]} />
        <Select label="Topic" size="field" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} />
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Not getting interview calls" />
        <Input label="Message" multiline rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe what you need help with…" />
        <p className="card-sub" style={{ margin: 0 }}>
          {toRole === 'counsellor'
            ? 'This goes to the counsellor for your course. They reply here and can arrange a call.'
            : 'This goes to your training provider (e.g. to update your job or salary on record).'}
        </p>
        {err && <p className="card-sub" style={{ color: 'var(--brick)', margin: 0 }}>{err}</p>}
      </div>
    </Modal>
  );
}
