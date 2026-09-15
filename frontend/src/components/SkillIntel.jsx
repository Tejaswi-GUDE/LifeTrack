import { cn } from '../lib/cn';
import Badge from './ui/Badge';
import Table from './ui/Table';
import EmptyState from './ui/EmptyState';

/**
 * SkillIntel — shared skills + career-growth panel.
 * Data from GET /api/trainees/:id → `skillIntel`
 *   { has, taught, targetOccupation, required, missingRole, missingDemand,
 *     coverage, recommendations[], growthPath[] }
 *
 * props:
 *   intel    the skillIntel object
 *   heading  optional section heading (default "Skills & career growth")
 *   dense    hide the growth-path strip (compact card variant)
 */
export default function SkillIntel({ intel, heading = 'Skills & career growth', dense = false }) {
  if (!intel) return null;
  const {
    has = [], required = [], missingRole = [],
    coverage, targetOccupation, recommendations = [], growthPath = [],
  } = intel;
  const hasLc = new Set(has.map((s) => s.toLowerCase()));

  return (
    <div>
      {heading && <div className="card-title" style={{ marginBottom: 4 }}>{heading}</div>}
      <div className="card-sub">
        {targetOccupation ? `Target role: ${targetOccupation}` : 'No target role resolved yet'}
        {coverage != null && ` · ${coverage}% of role skills covered`}
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="card-sub" style={{ marginBottom: 6 }}>Skills the trainee has ({has.length})</div>
        <div>
          {has.length === 0
            ? <span className="dash-note">None recorded yet.</span>
            : has.map((s) => <span key={s} className="chip-skill present">{s}</span>)}
        </div>
      </div>

      {required.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="card-sub" style={{ marginBottom: 6 }}>{targetOccupation} needs</div>
          <div>
            {required.map((s) => (
              <span key={s} className={cn('chip-skill', hasLc.has(s.toLowerCase()) && 'present')}>{s}</span>
            ))}
          </div>
          {missingRole.length > 0 && (
            <div className="card-sub" style={{ marginTop: 6 }}>
              Still missing for this role: <strong style={{ color: 'var(--brick)' }}>{missingRole.join(', ')}</strong>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="card-sub" style={{ marginBottom: 6 }}>
          In-demand skills not held yet — and how to build them while working
        </div>
        {recommendations.length === 0 ? (
          <EmptyState message="Skills for the current role are all covered." />
        ) : (
          <Table wrap>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Skill</Table.HeadCell>
                <Table.HeadCell>Opens up</Table.HeadCell>
                <Table.HeadCell>How to get it while working</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {recommendations.map((r) => (
                <Table.Row key={r.skill}>
                  <Table.Cell>
                    <div>{r.skill}</div>
                    {r.requiredForCurrentRole && (
                      <div style={{ marginTop: 3 }}><Badge variant="outline-brick">needed for current role</Badge></div>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="dash-note" style={{ maxWidth: 220, marginTop: 0 }}>
                      {(r.inDemandFor || []).join(', ') || '—'}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div style={{ fontSize: 12.5, maxWidth: 360 }}>{r.howToGrow}</div>
                    {r.why && <div className="dash-note" style={{ maxWidth: 360 }}>{r.why}</div>}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      {recommendations.length > 0 && (
        <div className="insight" style={{ marginTop: 14 }}>
          <div className="tag">Recommended next skill</div>
          <div className="body">
            Learn <strong>{recommendations[0].skill}</strong> next. {recommendations[0].howToGrow} This moves toward{' '}
            <strong>{recommendations[0].unlocks[0] || 'a higher pay band'}</strong>.
          </div>
        </div>
      )}

      {!dense && growthPath.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="card-sub" style={{ marginBottom: 6 }}>Career growth path — no break in employment</div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {growthPath.map((g, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{
                  flex: '0 0 auto', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '.04em', color: 'var(--slate)', minWidth: 96,
                }}>
                  {g.stage}
                </span>
                <span style={{ fontSize: 13 }}>{g.text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
