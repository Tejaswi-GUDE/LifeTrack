import { cn } from '../../lib/cn';

/**
 * KpiCard — the dashboard KPI pattern (Design System §"Applying consistently").
 * Matches the Government Dashboard's `.kpi` look; shared so every dashboard
 * built after the flagship screens stays consistent.
 *
 * props: label, value, sub (caption under a divider), tone (colours the value)
 */
export default function KpiCard({ label, value, sub, tone, className }) {
  return (
    <div className={cn('kpi-card', className)}>
      <div className="kc-label">{label}</div>
      <div className="kc-value" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      {sub != null && <div className="kc-sub">{sub}</div>}
    </div>
  );
}
