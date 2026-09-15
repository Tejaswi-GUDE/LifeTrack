import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useScopedEntity } from '../hooks/useScopedEntity';
import { useApi } from '../hooks/useApi';
import { fmtDate } from '../lib/format';

/**
 * LifeTrack Assistant — a scripted demo chatbot in the corner of every screen.
 * It is NOT wired to an LLM: replies are canned, but the follow-up reminders
 * and skill tips are built from the live API. Its job in the demo is to nudge
 * trainees about pending check-ins and point them at what to learn next.
 */
const OPEN_KEY = 'lifetrack.assistant.open';

export default function Assistant() {
  const { role } = useSession();
  const navigate = useNavigate();

  const trainee = useScopedEntity(role === 'trainee' ? 'trainee' : 'noop');
  const provider = useScopedEntity(role === 'provider' ? 'provider' : 'noop');

  const scopeParams = useMemo(() => {
    if (role === 'trainee') return trainee.id ? { traineeId: trainee.id } : null;
    if (role === 'provider') return provider.id ? { providerId: provider.id } : null;
    if (role === 'counsellor') return {};
    return null; // government / employer — no personal follow-up queue
  }, [role, trainee.id, provider.id]);

  const followApi = useApi(scopeParams ? '/followups' : null, scopeParams);
  const profileApi = useApi(role === 'trainee' && trainee.id ? `/trainees/${trainee.id}` : null);

  const followups = followApi.data?.followups || [];
  const pending = followups.filter((f) => f.status === 'due' || f.status === 'non_responsive');
  const upcoming = followups.filter((f) => f.status === 'scheduled');
  const intel = profileApi.data?.skillIntel;

  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  const [messages, setMessages] = useState([]);
  const bodyRef = useRef(null);
  const greeted = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* ignore */ }
  }, [open]);

  // greet + reminder the first time it opens with data available
  useEffect(() => {
    if (!open || greeted.current) return;
    if (followApi.loading) return;
    greeted.current = true;
    const lines = [{ from: 'bot', text: 'Hi — I’m the LifeTrack assistant. I keep track of your check-ins.' }];
    if (pending.length) {
      lines.push({
        from: 'bot',
        text: `You have ${pending.length} follow-up${pending.length === 1 ? '' : 's'} that need${pending.length === 1 ? 's' : ''} a response now:`,
        items: pending.slice(0, 4).map((f) => ({
          label: `${f.checkpointDay ? `Day ${f.checkpointDay}` : 'Check-in request'}${role !== 'trainee' ? ` · ${f.traineeName}` : ''} — ${f.status === 'non_responsive' ? 'no response yet' : 'due'}`,
          to: linkFor(f, role),
        })),
      });
    } else if (upcoming.length) {
      const next = [...upcoming].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
      lines.push({ from: 'bot', text: `Nothing due right now. Your next check-in is ${fmtDate(next.scheduledDate)}.` });
    } else {
      lines.push({ from: 'bot', text: 'You’re all caught up on check-ins. 🎉' });
    }
    setMessages(lines);
  }, [open, followApi.loading, pending.length, upcoming.length, role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open]);

  if (!role) return null;

  const push = (m) => setMessages((prev) => [...prev, m]);

  const ask = (key) => {
    if (key === 'followups') {
      push({ from: 'user', text: 'Any follow-ups pending?' });
      if (pending.length) {
        push({
          from: 'bot',
          text: `Yes — ${pending.length} waiting on a response:`,
          items: pending.slice(0, 5).map((f) => ({
            label: `${f.checkpointDay ? `Day ${f.checkpointDay}` : 'Check-in request'}${role !== 'trainee' ? ` · ${f.traineeName}` : ''}`,
            to: linkFor(f, role),
          })),
        });
      } else {
        push({ from: 'bot', text: upcoming.length ? `Nothing due. Next one: ${fmtDate([...upcoming].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0].scheduledDate)}.` : 'Nothing pending — you’re up to date.' });
      }
    } else if (key === 'learn') {
      push({ from: 'user', text: 'What should I learn next?' });
      if (intel && intel.recommendations && intel.recommendations.length) {
        const r = intel.recommendations[0];
        push({ from: 'bot', text: `Learn ${r.skill} next. ${r.howToGrow} It’s a step toward ${r.unlocks[0] || 'a higher pay band'}.`, items: [{ label: 'See my skills & growth path', to: '/trainee/home' }] });
      } else {
        push({ from: 'bot', text: 'Once you report a job in a check-in, I can suggest exactly which skill to pick up next.' });
      }
    } else if (key === 'grow') {
      push({ from: 'user', text: 'How do I grow while working?' });
      if (intel && intel.growthPath && intel.growthPath.length) {
        push({ from: 'bot', text: intel.growthPath.map((g) => `${g.stage}: ${g.text}`).join('\n') });
      } else {
        push({ from: 'bot', text: 'Keep responding to your check-ins — your growth path builds up from what you report.' });
      }
    } else if (key === 'later') {
      push({ from: 'user', text: 'Remind me later' });
      push({ from: 'bot', text: 'Okay — I’ll keep the reminder here whenever you open this.' });
      setTimeout(() => setOpen(false), 400);
    }
  };

  const chips = [
    { key: 'followups', label: 'Follow-ups pending?' },
    ...(role === 'trainee' ? [
      { key: 'learn', label: 'What to learn next?' },
      { key: 'grow', label: 'Grow while working?' },
    ] : []),
    { key: 'later', label: 'Remind me later' },
  ];

  return (
    <div className="lt-assistant">
      {open && (
        <div className="lt-assistant-panel" role="dialog" aria-label="LifeTrack assistant">
          <div className="lt-assistant-head">
            <span>
              LifeTrack Assistant
              {pending.length > 0 && <span className="lt-assistant-badge">{pending.length}</span>}
            </span>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="lt-assistant-body" ref={bodyRef}>
            {messages.length === 0 && <div className="lt-assistant-msg bot">One moment…</div>}
            {messages.map((m, i) => (
              <div key={i} className={`lt-assistant-msg ${m.from}`}>
                <span style={{ whiteSpace: 'pre-line' }}>{m.text}</span>
                {(m.items || []).map((it, j) => (
                  <button
                    key={j}
                    type="button"
                    className="lt-assistant-link"
                    onClick={() => { if (it.to) { navigate(it.to); setOpen(false); } }}
                  >
                    {it.label} →
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="lt-assistant-chips">
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={() => ask(c.key)}>{c.label}</button>
            ))}
          </div>
          <div className="lt-assistant-foot">Scripted demo assistant — replies are canned; reminders use live data.</div>
        </div>
      )}
      <button
        type="button"
        className="lt-assistant-fab"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '✕' : '💬'}
        {!open && pending.length > 0 && <span className="lt-assistant-fab-badge">{pending.length}</span>}
      </button>
    </div>
  );
}

function linkFor(f, role) {
  if (role === 'trainee') return `/trainee/followup/${f.id}`;
  if (role === 'counsellor') return `/counsellor/trainee/${f.traineeId}`;
  return `/provider/trainee/${f.traineeId}`;
}
