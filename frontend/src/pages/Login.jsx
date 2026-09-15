import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';
import { useSession } from '../context/SessionContext';
import { useApi } from '../hooks/useApi';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { Skeleton } from '../components/ui/Loading';

/**
 * Login — demo access (no password). Pick a role, then, for the role-scoped
 * personas, pick which seeded provider / trainee / employer to sign in as.
 * The choice is written onto the client session so useScopedEntity picks it up.
 */
const ROLES = [
  {
    role: 'government',
    label: 'Government / Policymaker',
    blurb: 'District & provider outcomes, skill-gap intelligence, alerts.',
    to: '/government/dashboard',
    scope: null,
    name: 'Dept. of Skill Development (State)',
  },
  {
    role: 'provider',
    label: 'Training Provider',
    blurb: 'Your cohorts, at-risk trainees, follow-ups and course skill gaps.',
    to: '/provider/dashboard',
    scope: 'provider',
  },
  {
    role: 'counsellor',
    label: 'Counsellor',
    blurb: 'Course-assigned worklist — trainee requests + intervention review.',
    to: '/counsellor/requests',
    scope: 'counsellor',
  },
  {
    role: 'trainee',
    label: 'Trainee',
    blurb: 'Your career record, skills, follow-ups and consent.',
    to: '/trainee/home',
    scope: 'trainee',
  },
  {
    role: 'employer',
    label: 'Employer',
    blurb: 'Confirm hires, view candidates and skill match.',
    to: '/employer/dashboard',
    scope: 'employer',
  },
];

const SCOPE_CFG = {
  provider: {
    path: '/providers', key: 'providers', idField: 'id', labelField: 'name',
    sessionKey: 'providerId', nameKey: 'providerName',
    prompt: 'Sign in as which training provider?',
    optionLabel: (o) => `${o.name}${o.district ? ` · ${o.district}` : ''}`,
    displayName: (o) => `${o.name} — Admin`,
  },
  trainee: {
    path: '/trainees', key: 'trainees', idField: 'id', labelField: 'name',
    sessionKey: 'traineeId', nameKey: 'traineeName',
    prompt: 'Sign in as which trainee?',
    optionLabel: (o) => `${o.name}${o.course ? ` · ${o.course}` : ''}${o.district ? ` · ${o.district}` : ''}`,
    displayName: (o) => o.name,
  },
  employer: {
    path: '/employers', key: 'employers', idField: 'name', labelField: 'name',
    sessionKey: 'employer', nameKey: 'employer',
    prompt: 'Sign in as which employer?',
    optionLabel: (o) => `${o.name}${o.employeeCount ? ` · ${o.employeeCount} hire${o.employeeCount === 1 ? '' : 's'}` : ''}`,
    displayName: (o) => o.name,
  },
  counsellor: {
    path: '/counsellors', key: 'counsellors', idField: 'id', labelField: 'name',
    sessionKey: 'counsellorId', nameKey: 'counsellorName',
    prompt: 'Sign in as which counsellor?',
    optionLabel: (o) => `${o.name}${o.courses && o.courses.length ? ` · ${o.courses.join(', ')}` : ''}`,
    displayName: (o) => o.name,
  },
};

const LOOP = ['Track', 'Understand', 'Predict', 'Intervene', 'Measure again'];

export default function Login() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [picked, setPicked] = useState(null); // a ROLES entry (scoped) awaiting entity choice
  const [entityId, setEntityId] = useState('');

  const cfg = picked && picked.scope ? SCOPE_CFG[picked.scope] : null;
  const { data, loading, error } = useApi(cfg ? cfg.path : null);
  const options = useMemo(() => (cfg && data ? data[cfg.key] || [] : []), [cfg, data]);

  // default to the first option once the list loads
  useEffect(() => {
    if (options.length && !entityId) setEntityId(String(options[0][cfg.idField]));
  }, [options, entityId, cfg]);

  const chooseRole = (r) => {
    if (!r.scope) {
      signIn({ role: r.role, name: r.name });
      navigate(r.to);
      return;
    }
    setPicked(r);
    setEntityId('');
  };

  const back = () => {
    setPicked(null);
    setEntityId('');
  };

  const enter = () => {
    const opt = options.find((o) => String(o[cfg.idField]) === String(entityId)) || options[0];
    if (!opt) return;
    signIn({
      role: picked.role,
      name: cfg.displayName(opt),
      [cfg.sessionKey]: opt[cfg.idField],
      [cfg.nameKey]: opt[cfg.labelField],
    });
    navigate(picked.to);
  };

  return (
    <div className="login-shell">
      <aside className="login-brand">
        <div>
          <div className="login-brand-word">LifeTrack</div>
          <div className="login-brand-tag">
            Longitudinal skilling-outcomes &amp; livelihood intelligence — one continuous, verified record per trainee.
          </div>
          <ol className="login-loop">
            {LOOP.map((step, i) => (
              <li key={step}>
                <span className="n">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="login-foot">SIH prototype · demo data · no personal data</div>
      </aside>

      <main className="login-main">
        {!picked ? (
          <>
            <h1 className="login-h1">Choose a role to sign in</h1>
            <p className="login-sub">Demo access — no password. Pick a role, then the account to enter as.</p>
            <div className="role-grid">
              {ROLES.map((r) => (
                <button key={r.role} type="button" className="role-card" onClick={() => chooseRole(r)}>
                  <div className="rc-name">{r.label}</div>
                  <div className="rc-blurb">{r.blurb}</div>
                  {r.scope && <div className="rc-tag">choose a specific {r.scope}</div>}
                </button>
              ))}
            </div>
            <p className="login-note">
              Employers normally act on a shared verification link; the Employer role here is for the demo.
            </p>
          </>
        ) : (
          <div className="login-step2">
            <button type="button" className="login-back" onClick={back}>← Choose a different role</button>
            <h1 className="login-h1">{picked.label}</h1>
            <p className="login-sub">{cfg.prompt}</p>

            {error ? (
              <p className="rc-blurb" style={{ color: 'var(--brick)' }}>
                Couldn’t load the list. Is the backend running?
              </p>
            ) : loading && !options.length ? (
              <Skeleton height={40} />
            ) : (
              <Select
                size="field"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                aria-label={cfg.prompt}
                options={options.map((o) => ({ value: String(o[cfg.idField]), label: cfg.optionLabel(o) }))}
              />
            )}

            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <Button variant="primary" onClick={enter} disabled={!entityId}>
                Enter as {picked.label}
              </Button>
            </div>
            <p className="login-note">You can switch {cfg && picked.scope} anytime from the top bar.</p>
          </div>
        )}
      </main>
    </div>
  );
}
