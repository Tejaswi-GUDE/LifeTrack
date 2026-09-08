/**
 * Lightweight visualisations — pure SVG / CSS, no chart library (Design
 * System §17: semantic palette, 2px lines, no gradients/3D/shadows). Styles
 * live in primitives.css (`.mini-bars`, `.stacked-bar`, `.trendline`,
 * `.heatmap`, `.chart-legend`).
 */
import { cn } from '../../lib/cn';

/* ---------- horizontal bars (categorical comparison) ---------- */
export function MiniBars({ data, max, formatValue = (v) => v, color = 'var(--ink)', className }) {
  const cap = max ?? Math.max(1, ...data.map((d) => d.value || 0));
  return (
    <div className={cn('mini-bars', className)}>
      {data.map((d) => (
        <div className="mini-bar-row" key={d.label}>
          <span title={d.label} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </span>
          <span className="mini-bar-track">
            <span
              className="mini-bar-fill"
              style={{ width: `${Math.max(2, ((d.value || 0) / cap) * 100)}%`, background: d.color || color }}
            />
          </span>
          <span className="mb-val">{formatValue(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- stacked segmented bar + legend (distribution) ---------- */
export function StackedBar({ segments, className }) {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  return (
    <div className={className}>
      <div className="stacked-bar">
        {segments.map((s) => (
          <span
            key={s.label}
            style={{ width: `${((s.value || 0) / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="chart-legend">
        {segments.map((s) => (
          <span key={s.label}>
            <span className="dot" style={{ background: s.color }} />
            {s.label} — {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- trend line (SVG polyline; teal when rising, brick when falling) ---------- */
export function TrendLine({ points, formatX = (x) => x, formatY = (y) => y, height = 120, className }) {
  if (!points || points.length < 2) {
    return <div className="dash-note">Not enough data points to plot a trend yet.</div>;
  }
  const w = 320;
  const pad = 6;
  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.y - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const rising = ys[ys.length - 1] >= ys[0];
  const stroke = rising ? 'var(--teal)' : 'var(--brick)';
  return (
    <div className={className}>
      <svg className="trendline" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ height }}>
        <polyline points={coords.map((c) => c.join(',')).join(' ')} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c[0]} cy={c[1]} r="3" fill={stroke} />
        ))}
      </svg>
      <div className="trendline-axis">
        {points.map((p, i) => (
          <span key={i}>{formatX(p.x)}</span>
        ))}
      </div>
      <div className="dash-note">
        {points.map((p, i) => `${formatX(p.x)}: ${formatY(p.y)}`).join('  ·  ')}
      </div>
    </div>
  );
}

/* ---------- heatmap grid (district × skill gap intensity) ---------- */
export function Heatmap({ rows, cols, cells, className }) {
  if (!rows.length || !cols.length) {
    return <div className="dash-note">No gap data to map for this scope.</div>;
  }
  const maxV = Math.max(1, ...cells.flat());
  const cellBg = (v) => {
    if (!v) return 'var(--slate-10)';
    const t = 0.12 + 0.55 * (v / maxV); // tint toward brick
    return `color-mix(in srgb, var(--brick) ${Math.round(t * 100)}%, var(--paper-raised))`;
  };
  return (
    <div
      className={cn('heatmap', className)}
      style={{ gridTemplateColumns: `minmax(70px, 22%) repeat(${cols.length}, 1fr)` }}
    >
      <div className="heatmap-collabel" />
      {cols.map((c) => (
        <div className="heatmap-collabel" key={c}>
          {c}
        </div>
      ))}
      {rows.map((r, ri) => (
        <FragmentRow key={r} label={r} values={cells[ri]} cellBg={cellBg} />
      ))}
    </div>
  );
}
function FragmentRow({ label, values, cellBg }) {
  return (
    <>
      <div className="heatmap-rowlabel">{label}</div>
      {values.map((v, i) => (
        <div className="heatmap-cell" key={i} style={{ background: cellBg(v) }} title={`${label}: ${v}`}>
          {v || ''}
        </div>
      ))}
    </>
  );
}
