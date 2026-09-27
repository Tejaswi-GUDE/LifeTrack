import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import './guided-demo.css';

/**
 * GuidedDemo — floating card walkthrough (9 steps) showing Lakshmi's journey
 * Steps: 1) Import, 2) Mock phone, 3) Agent, 4) Employer verify, 5) Timeline,
 *        6) Counsellor, 7) Re-placed, 8) Government, 9) Consent
 */
const DEMO_STEPS = [
  {
    step: 1,
    title: 'Import Data',
    desc: 'Provider imports two CSVs → Lakshmi linked into one record',
    role: 'provider',
    route: '/provider/dashboard',
  },
  {
    step: 2,
    title: 'Mock Phone',
    desc: 'Demo phone: WhatsApp fails → SMS → IVR → alternate contact',
    role: 'provider',
    route: '/dev/phone',
  },
  {
    step: 3,
    title: 'Agent Call',
    desc: 'Field agent completes call (L2 Assisted)',
    role: 'field_agent',
    route: '/agent/queue',
  },
  {
    step: 4,
    title: 'Employer Verify',
    desc: 'One click verification link → badge turns High · L4',
    role: 'employer',
    route: '/employer/verify',
  },
  {
    step: 5,
    title: 'Trainee Timeline',
    desc: 'Lakshmi leaves for low pay → attrition flag',
    role: 'trainee',
    route: '/trainee/timeline',
  },
  {
    step: 6,
    title: 'Counsellor',
    desc: 'Risk points explained, approve bridge course',
    role: 'counsellor',
    route: '/counsellor/worklist',
  },
  {
    step: 7,
    title: 'Re-placement',
    desc: 'Risk drops on timeline after course completion',
    role: 'provider',
    route: '/provider/trainee/lakshmi',
  },
  {
    step: 8,
    title: 'Government',
    desc: 'District KPIs, Verified-only toggle, equity gap',
    role: 'government',
    route: '/government/dashboard',
  },
  {
    step: 9,
    title: 'Consent Center',
    desc: 'Consent matrix & "who accessed my data" history',
    role: 'trainee',
    route: '/trainee/consent',
  },
];

export default function GuidedDemo() {
  const navigate = useNavigate();
  const { session, signIn } = useSession();
  const [step, setStep] = useState(1);
  const [open, setOpen] = useState(false);

  const current = DEMO_STEPS[step - 1];

  const goNext = () => {
    if (step < DEMO_STEPS.length) {
      const nextStep = DEMO_STEPS[step];
      if (nextStep.role !== session?.role) {
        // Switch role
        signIn({ role: nextStep.role, name: `Demo ${nextStep.role}` });
      }
      setStep(step + 1);
      navigate(nextStep.route);
    }
  };

  const goPrev = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          className="demo-fab"
          onClick={() => setOpen(true)}
          title="Start guided demo"
        >
          ?
        </button>
      )}

      {/* Card */}
      {open && current && (
        <div className="demo-card">
          <div className="demo-head">
            <h3>Guided Demo</h3>
            <button className="demo-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="demo-body">
            <div className="demo-step">Step {step} of 9</div>
            <h4>{current.title}</h4>
            <p>{current.desc}</p>
            <div className="demo-progress">
              <div className="progress-bar" style={{ width: `${(step / 9) * 100}%` }} />
            </div>
          </div>
          <div className="demo-footer">
            <button
              onClick={goPrev}
              disabled={step === 1}
              className="demo-btn"
            >
              ← Back
            </button>
            <button
              onClick={goNext}
              disabled={step === 9}
              className="demo-btn demo-next"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
