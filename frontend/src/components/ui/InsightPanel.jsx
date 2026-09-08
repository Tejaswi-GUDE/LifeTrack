import { cn } from '../../lib/cn';

/**
 * InsightPanel — Design System §16.
 * The ONLY place --plum appears: every piece of system-generated reasoning
 * (risk factors, root cause, intervention recommendation) sits here so a
 * reader instantly knows they're reading an inference, not an entered fact.
 * An insight always ends with the data points it was based on — never a bare
 * conclusion.
 *
 * props: label (default 'System insight'), basis (the "Based on: …" line), children
 */
const Spark = () => (
  <svg className="spark" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0l1.6 5.4L15 7l-5.4 1.6L8 14l-1.6-5.4L1 7l5.4-1.6L8 0z" />
  </svg>
);

export default function InsightPanel({ label = 'System insight', basis, className, children }) {
  return (
    <div className={cn('insight', className)}>
      <div className="tag">
        <Spark />
        {label}
      </div>
      <div className="body">{children}</div>
      {basis && <div className="basis">{basis}</div>}
    </div>
  );
}
