import { useState } from 'react';
import { cn } from '../lib/cn';
import Badge from './ui/Badge';
import InsightPanel from './ui/InsightPanel';

/**
 * Career Timeline — Design System §18 (the product's hero component).
 * A solid --ink spine with dated entries branching off it; each node carries
 * the seal / outline / dashed confidence treatment; AI entries render as a
 * Plum insight panel on the same spine.
 *
 * Reusable: pass a `timeline` array from GET /api/trainees/:id. Each event:
 *   { id, at, dateLabel, stage, categories[], node, pending, headline,
 *     headlineStyle: 'serif'|'sans', detail, badges:[{text,variant}],
 *     insight: null | { label, body, basis, badges }, expand: null | { title, rows:[[k,v]] } }
 */
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'outcomes', label: 'Outcomes' },
  { value: 'followups', label: 'Follow-ups' },
  { value: 'verification', label: 'Verification' },
  { value: 'interventions', label: 'Interventions' },
];

export default function Timeline({ timeline = [], title = 'Career Timeline', showFilter = true }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  const shown =
    filter === 'all' ? timeline : timeline.filter((e) => (e.categories || []).includes(filter));

  return (
    <div>
      {(title || showFilter) && (
        <div className="timeline-toolbar">
          {title && <h2>{title}</h2>}
          {showFilter && (
            <div className="chip-filter" role="tablist" aria-label="Filter timeline">
              {FILTERS.map((f) => (
                <button
                  type="button"
                  key={f.value}
                  role="tab"
                  aria-selected={filter === f.value}
                  className={cn('chip', filter === f.value && 'active')}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty-state">
          <p style={{ margin: 0 }}>No events in this view.</p>
        </div>
      ) : (
        <div className="timeline">
          {shown.map((e) => (
            <TimelineEvent
              key={e.id}
              event={e}
              open={!!expanded[e.id]}
              onToggle={() => setExpanded((s) => ({ ...s, [e.id]: !s[e.id] }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineEvent({ event: e, open, onToggle }) {
  const nodeClass = cn('t-node', e.node);
  const nodeStyle = e.pending ? { opacity: 0.5 } : undefined;

  if (e.insight) {
    return (
      <div className="t-event">
        <div className={nodeClass} style={nodeStyle} />
        {e.dateLabel && <div className="t-date">{e.dateLabel}</div>}
        {e.stage && <span className="stage-label">{e.stage}</span>}
        <InsightPanel label={e.insight.label} basis={e.insight.basis}>
          {e.insight.body}
        </InsightPanel>
        {(e.insight.badges || []).length > 0 && (
          <div className="badges-inline" style={{ marginTop: 10 }}>
            {e.insight.badges.map((b, i) => (
              <Badge key={i} variant={b.variant}>
                {b.text}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  const canExpand = e.expand && (e.expand.rows || []).length > 0;

  return (
    <div className="t-event">
      <div className={nodeClass} style={nodeStyle} />
      {e.dateLabel && <div className="t-date">{e.dateLabel}</div>}
      {e.stage && <span className="stage-label">{e.stage}</span>}
      <div className="t-card" style={e.pending ? { opacity: 0.6 } : undefined}>
        <div
          className="t-headline"
          style={e.headlineStyle === 'sans' ? { fontFamily: 'var(--sans)', fontWeight: 500 } : undefined}
        >
          {e.headline}
        </div>
        {e.detail && <div className="t-detail">{e.detail}</div>}
        {(e.badges || []).length > 0 && (
          <div className="badges-inline">
            {e.badges.map((b, i) => (
              <Badge key={i} variant={b.variant}>
                {b.text}
              </Badge>
            ))}
          </div>
        )}
        {canExpand && (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm t-expand-btn"
              onClick={onToggle}
              aria-expanded={open}
            >
              {open ? 'Hide details' : 'View details'}
            </button>
            {open && (
              <div className="t-expand">
                <div className="t-expand-title">{e.expand.title}</div>
                {e.expand.rows.map(([k, v], i) => (
                  <div className="t-expand-row" key={i}>
                    <span className="k">{k}</span>
                    <span className="v">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
