import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { MiniBars, Heatmap } from '../../components/charts';

/**
 * District Skill Intelligence (government). A focused view of the analytics
 * endpoint's skill blocks: what's taught vs required, the biggest gaps, and a
 * district heatmap. Deeper drill-downs live on the Analytics screen.
 */
export default function SkillIntelligence() {
  const [district, setDistrict] = useState('');
  const { data, error, loading, reload } = useApi(
    '/analytics/outcomes',
    useMemo(() => ({ district: district || undefined }), [district]),
  );
  const districts = data?.filterOptions?.districts || [];

  useTopbarActions(
    <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District filter">
      <option value="">All districts</option>
      {districts.map((d) => <option key={d} value={d}>{d}</option>)}
    </select>,
    [district, districts.length],
  );

  if (error) return <ErrorState message="Couldn't load skill intelligence. Retry." onRetry={reload} />;
  if (loading && !data) return <div className="dash-grid-2"><Card><Skeleton height={200} /></Card><Card><Skeleton height={200} /></Card></div>;
  if (!data) return null;

  const bothSides = data.skillSupplyDemand.filter((s) => s.demand && s.supply).length;
  const gapOnly = data.skillSupplyDemand.filter((s) => s.demand && !s.supply);

  return (
    <>
      <div className="dash-grid-2">
        <Card title="Supply vs demand" subtitle="Skills taught by courses vs required by the roles trainees work in">
          <p className="dash-note" style={{ marginTop: 0 }}>
            {bothSides} skills are both taught and in demand.
            {gapOnly.length > 0 ? ` ${gapOnly.length} in-demand skill${gapOnly.length === 1 ? ' is' : 's are'} not taught anywhere in scope.` : ' Every in-demand skill is covered somewhere.'}
          </p>
          <div className="mini-bars">
            {data.skillSupplyDemand.map((s) => (
              <div className="dash-list-row" key={s.skill}>
                <span>{s.skill}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <Badge variant={s.supply ? 'outline-teal' : 'neutral'}>{s.supply ? 'Taught' : 'Not taught'}</Badge>
                  <Badge variant={s.demand ? 'outline-ochre' : 'neutral'}>{s.demand ? 'In demand' : 'No demand'}</Badge>
                  {s.gapTrainees > 0 && <Badge variant="outline-brick">Gap: {s.gapTrainees}</Badge>}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Most frequently missing skills" subtitle="Across trainees with a computed skill match">
          {data.skillGaps.length === 0 ? (
            <EmptyState message="No skill gaps detected in this scope." />
          ) : (
            <MiniBars
              data={data.skillGaps.map((g) => ({ label: g.skill, value: g.affectedTrainees, color: 'var(--ochre)' }))}
              formatValue={(v) => `${v} trainee${v === 1 ? '' : 's'}`}
            />
          )}
          <p className="dash-note">
            <Link to="/government/analytics" style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
              Full outcome analytics →
            </Link>
          </p>
        </Card>
      </div>

      <Card title="District × skill-gap intensity" subtitle="Trainees whose training lacks a required skill, by district">
        <Heatmap rows={data.heatmap.rows} cols={data.heatmap.cols} cells={data.heatmap.cells} />
      </Card>
    </>
  );
}
