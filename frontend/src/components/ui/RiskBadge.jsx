import Badge from './Badge';
import { cn } from '../../lib/cn';

/**
 * RiskBadge — Design System §15.
 * Built from one 0–100 score, shown two ways:
 *   variant="bar"      → compact horizontal bar + score (tables, worklists)
 *   variant="expanded" → large number + band badge + ALWAYS-VISIBLE factor list
 *
 * The factor list is non-negotiable: a risk score is never shown in the
 * expanded form without its reasons directly underneath, in the same weight.
 */
function deriveBand(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

const BAND_META = {
  high: { tone: 'brick', color: 'var(--brick)', label: 'High' },
  medium: { tone: 'ochre', color: 'var(--ochre)', label: 'Medium' },
  low: { tone: 'teal', color: 'var(--teal)', label: 'Low' },
};

export default function RiskBadge({
  score = 0,
  band,
  variant = 'bar',
  factors = [],
  caption,
  title,
  className,
}) {
  const resolvedBand = band || deriveBand(score);
  const meta = BAND_META[resolvedBand] || BAND_META.low;
  const pct = Math.max(0, Math.min(100, score));

  if (variant === 'expanded') {
    return (
      <div className={className}>
        {title && (
          <div className="card-title" style={{ marginBottom: 12 }}>
            {title}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: factors.length ? 14 : 0 }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: meta.color,
            }}
          >
            {Math.round(score)}
            <span style={{ fontSize: 15, color: 'var(--slate)', fontWeight: 500 }}> / 100</span>
          </span>
          <div>
            <Badge tone={meta.tone} fill="outline">
              {meta.label} risk
            </Badge>
            {caption && <div className="card-sub" style={{ margin: '6px 0 0' }}>{caption}</div>}
          </div>
        </div>
        {factors.length > 0 && (
          <div className="factor-list">
            {factors.map((f, i) => (
              <div className="factor" key={i}>
                <span>{f.label}</span>
                <span className="pts" style={{ color: meta.color }}>
                  +{f.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // compact bar
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: 8 }}>
      <span className="risk-bar-track">
        <span className="risk-bar-fill" style={{ width: `${pct}%`, background: meta.color }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(score)} · {meta.label}
      </span>
    </span>
  );
}
