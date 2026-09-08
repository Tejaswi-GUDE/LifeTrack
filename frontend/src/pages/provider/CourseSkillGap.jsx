import { useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import { cn } from '../../lib/cn';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { MiniBars } from '../../components/charts';
import { pctInt } from '../../lib/format';

/**
 * Course Skill-Gap report. Two modes:
 *  - /provider/skill-gaps            → all of the provider's courses
 *  - /provider/course/:id/skill-gap  → one course
 * Data from GET /api/courses/skill-gap and /api/courses/:id/skill-gap.
 */
export default function CourseSkillGap() {
  const { id: courseId } = useParams();
  const provider = useScopedEntity('provider');

  const single = Boolean(courseId);
  const path = single ? `/courses/${courseId}/skill-gap` : provider.id ? '/courses/skill-gap' : null;
  const params = single ? undefined : { providerId: provider.id || undefined };
  const { data, error, loading, reload } = useApi(path, params);

  useTopbarActions(single ? null : provider.Switcher, [provider.id, single]);

  if (provider.error || error) return <ErrorState message="Couldn't load the skill-gap report. Retry." onRetry={reload} />;
  if ((loading && !data) || (!single && provider.loading && !provider.id)) {
    return <Card><Skeleton height={220} /></Card>;
  }
  if (!data) return null;

  const courses = single ? [data] : data.courses || [];
  if (courses.length === 0) return <EmptyState message="No courses to report on for this provider." />;

  return (
    <>
      {courses.map((c) => (
        <Card key={c.id} className="course-gap-card" style={{ marginBottom: 20 }}>
          <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <div className="card-title">{c.name}</div>
              <div className="card-sub">
                {c.provider ? `${c.provider} · ` : ''}{c.trainees} trainee{c.trainees === 1 ? '' : 's'}
                {c.targetOccupation ? ` · target role: ${c.targetOccupation}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Badge variant="outline-slate">Avg match {c.avgSkillMatch != null ? `${c.avgSkillMatch}%` : '—'}</Badge>
              {c.mismatchRate != null && <Badge variant={c.mismatchRate > 0 ? 'outline-brick' : 'outline-teal'}>Mismatch {pctInt(c.mismatchRate)}</Badge>}
            </div>
          </div>

          <div className="dash-grid-2" style={{ marginBottom: 0 }}>
            <div>
              <div className="card-sub" style={{ marginBottom: 8 }}>Skills taught</div>
              {(c.taughtSkills || []).map((s) => <span key={s} className="chip-skill present">{s}</span>)}
              {c.targetOccupation && (
                <>
                  <div className="card-sub" style={{ margin: '12px 0 8px' }}>{c.targetOccupation} requires</div>
                  {(c.requiredSkills || []).map((s) => (
                    <span key={s} className={cn('chip-skill', (c.taughtSkills || []).map((x) => x.toLowerCase()).includes(s.toLowerCase()) && 'present')}>
                      {s}
                    </span>
                  ))}
                </>
              )}
            </div>
            <div>
              <div className="card-sub" style={{ marginBottom: 8 }}>Missing skills (by affected trainees)</div>
              {(c.missingSkills || []).length === 0 ? (
                <EmptyState message="No missing skills — training covers the target role." />
              ) : (
                <MiniBars
                  data={c.missingSkills.map((m) => ({
                    label: `${m.skill}${m.structural ? ' *' : ''}`,
                    value: m.affectedTrainees,
                    color: m.affectedTrainees > 0 ? 'var(--brick)' : 'var(--slate-30)',
                  }))}
                  formatValue={(v) => `${v}`}
                />
              )}
              <div className="dash-note">* structural gap — required by the role but not in the curriculum</div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
