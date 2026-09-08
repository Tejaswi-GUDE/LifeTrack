import { cn } from '../../lib/cn';

/**
 * Alert — Design System §14.
 * Left-accent banner (not a full-colour fill, which would fight the badge
 * system). --paper-raised, --radius-md, 4px left border in the semantic
 * colour. Alerts always name the specific number or fact that triggered them
 * — never a generic "Attention needed."
 *
 * props: tone 'risk'|'warning'|'positive' (default 'risk'), title, children, action
 */
const TONE = {
  risk: { cls: '', stroke: 'var(--brick)' },
  warning: { cls: 'warning', stroke: 'var(--ochre)' },
  positive: { cls: 'positive', stroke: 'var(--teal)' },
};

export default function Alert({ tone = 'risk', title, action, className, children }) {
  const t = TONE[tone] || TONE.risk;
  return (
    <div className={cn('alert', t.cls, className)}>
      <svg className="a-icon" viewBox="0 0 20 20" fill="none" stroke={t.stroke} strokeWidth="1.6" aria-hidden="true">
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6v5M10 14h.01" />
      </svg>
      <div style={{ flex: 1 }}>
        {title != null && <div className="a-title">{title}</div>}
        {children != null && <div className="a-body">{children}</div>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
      </div>
    </div>
  );
}
