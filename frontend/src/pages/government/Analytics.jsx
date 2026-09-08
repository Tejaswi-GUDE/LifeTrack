import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { StackedBar, TrendLine, Heatmap } from '../../components/charts';
import { pct, pctInt, inr, reasonColor } from '../../lib/format';

function AnalyticsSkeleton() {
  return (
    <>
      <div className="kpi-grid">{[0, 1, 2, 3, 4, 5].map((i) => <div className="kpi-card" key={i}><Skeleton width="55%" height={12} /><div style={{ height: 10 }} /><Skeleton width="40%" height={26} /></div>)}</div>
      <div className="dash-grid-2"><Card><Skeleton height={160} /></Card><Card><Skeleton height={160} /></Card></div>
    </>
  );
}

export default function OutcomeAnalytics() {
  const { districtId } = useParams(); // set when routed as /government/district/:districtId
  const navigate = useNavigate();
  const [district, setDistrict] = useState(districtId || '');
  const [courseId, setCourseId] = useState('');
  const [providerId, setProviderId] = useState('');

  const params = useMemo(
    () => ({ district: district || undefined, courseId: courseId || undefined, providerId: providerId || undefined }),
    [district, courseId, providerId],
  );
  const { data, error, loading, reload } = useApi('/analytics/outcomes', params);
  const fo = data?.filterOptions || { districts: [], courses: [], providers: [] };

  useTopbarActions(
    <>
      <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District filter">
        <option value="">All districts</option>
        {fo.districts.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className="select" value={providerId} onChange={(e) => setProviderId(e.target.value)} aria-label="Provider filter">
        <option value="">All providers</option>
        {fo.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Course filter">
        <option value="">All courses</option>
        {fo.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </>,
    [district, providerId, courseId, fo.districts.length, fo.courses.length, fo.providers.length],
  );

  if (error) return <ErrorState message="Couldn't load outcome analytics. Retry." onRetry={reload} />;
  if (loading && !data) return <AnalyticsSkeleton />;
  if (!data) return null;

  const k = data.kpis;
  const empty = k.trained === 0;
  if (empty) return <EmptyState message="No trainees in this scope yet." />;

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="Total trained" value={k.trained} sub={`${k.certified} certified`} />
        <KpiCard label="Placement rate" value={pctInt(k.placementRate.value)} sub={`${k.placementRate.numerator} of ${k.placementRate.denominator} certified`} />
        <KpiCard label="Retention rate" value={pctInt(k.retentionRate.value)} sub={`${k.retentionRate.numerator} of ${k.retentionRate.denominator} ever-employed`} />
        <KpiCard label="Avg. wage growth" value={pct(k.wageGrowth.value)} sub={`${k.wageGrowth.sampleSize} trainees, 2+ checkpoints`} />
        <KpiCard label="Avg. skill match" value={pctInt(k.skillMatch.value)} sub={`${k.skillMatch.sampleSize} working trainees`} />
        <KpiCard label="Self-employed / apprentice" value={`${k.selfEmployed} / ${k.apprentices}`} sub="first-class outcomes" />
      </div>

      <div className="dash-grid-2">
        <Card title="Wage progression" subtitle="Average income by follow-up checkpoint (across cohort)">
          <TrendLine points={data.trends.wageByCheckpoint.map((w) => ({ x: `D${w.checkpointDay}`, y: w.avgIncome }))} formatY={(y) => inr(y)} />
        </Card>
        <Card title="Outcome mix" subtitle={`${k.trained} trainees in scope`}>
          <StackedBar
            segments={data.trends.outcomeMix.map((m) => ({
              label: m.label,
              value: m.count,
              color:
                m.status === 'employed' || m.status === 'self_employed' || m.status === 'apprentice' ? 'var(--teal)'
                  : m.status === 'job_lost' ? 'var(--brick)'
                    : m.status === 'unemployed' || m.status === 'not_responding' ? 'var(--ochre)'
                      : 'var(--slate-30)',
            }))}
          />
          <div className="chart-legend" style={{ marginTop: 12 }}>
            <span>
              <span className="dot" style={{ background: 'var(--teal)' }} />
              Confidence: {data.confidenceDistribution.high} high · {data.confidenceDistribution.medium} medium · {data.confidenceDistribution.low} low
            </span>
          </div>
        </Card>
      </div>

      <div className="dash-grid-2">
        <Card title="Provider comparison" subtitle="Placement rate by provider">
          <Table wrap>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Provider</Table.HeadCell>
                <Table.HeadCell>District</Table.HeadCell>
                <Table.HeadCell numeric>Trainees</Table.HeadCell>
                <Table.HeadCell numeric>Placement</Table.HeadCell>
                <Table.HeadCell numeric>Skill match</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {data.providerComparison.map((p) => (
                <Table.Row key={p.id} onClick={() => navigate(`/government/provider/${p.id}`)}>
                  <Table.Cell>{p.name}</Table.Cell>
                  <Table.Cell>{p.district}</Table.Cell>
                  <Table.Cell numeric>{p.trainees}</Table.Cell>
                  <Table.Cell numeric style={{ color: p.placementRate != null && p.placementRate < 50 ? 'var(--brick)' : p.placementRate >= 75 ? 'var(--teal)' : undefined }}>
                    {pctInt(p.placementRate)}
                  </Table.Cell>
                  <Table.Cell numeric>{pctInt(p.skillMatch)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
        <Card title="Course comparison" subtitle="Placement rate by course">
          <Table wrap>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Course</Table.HeadCell>
                <Table.HeadCell numeric>Trainees</Table.HeadCell>
                <Table.HeadCell numeric>Placement</Table.HeadCell>
                <Table.HeadCell numeric>Skill match</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {data.courseComparison.map((c) => (
                <Table.Row key={c.id}>
                  <Table.Cell>
                    <div>{c.name}</div>
                    <div className="dl-sub">{c.provider}</div>
                  </Table.Cell>
                  <Table.Cell numeric>{c.trainees}</Table.Cell>
                  <Table.Cell numeric>{pctInt(c.placementRate)}</Table.Cell>
                  <Table.Cell numeric>{pctInt(c.skillMatch)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      </div>

      <div className="dash-grid-2">
        <Card title="Non-placement reasons" subtitle={`Among ${data.nonPlacement.total} unplaced / non-responsive`}>
          {data.nonPlacement.total === 0 ? (
            <EmptyState message="No unplaced trainees in this scope." />
          ) : (
            <StackedBar segments={data.nonPlacement.reasons.map((r) => ({ label: r.displayLabel, value: r.count, color: reasonColor(r.label) }))} />
          )}
        </Card>
        <Card title="Skill supply vs demand" subtitle="Taught by courses (S) vs required by employed roles (D)">
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
      </div>

      <Card title="District × skill-gap intensity" subtitle="Trainees whose training lacks a required skill, by district">
        <Heatmap rows={data.heatmap.rows} cols={data.heatmap.cols} cells={data.heatmap.cells} />
      </Card>

      <div style={{ height: 20 }} />

      <div className="dash-grid-2">
        <Card title="Outcomes by gender" subtitle="Aggregate only — never shown at individual level">
          <DemoTable rows={data.demographics.byGender} />
        </Card>
        <Card title="Outcomes by age band">
          <DemoTable rows={data.demographics.byAgeBand} />
        </Card>
      </div>
    </>
  );
}

function DemoTable({ rows }) {
  if (!rows || rows.length === 0) return <EmptyState message="No demographic data in this scope." />;
  return (
    <Table wrap>
      <Table.Head>
        <Table.Row>
          <Table.HeadCell>Group</Table.HeadCell>
          <Table.HeadCell numeric>Trainees</Table.HeadCell>
          <Table.HeadCell numeric>Placement</Table.HeadCell>
          <Table.HeadCell numeric>Skill match</Table.HeadCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {rows.map((r) => (
          <Table.Row key={r.key}>
            <Table.Cell>{r.label}</Table.Cell>
            <Table.Cell numeric>{r.trainees}</Table.Cell>
            <Table.Cell numeric>{pctInt(r.placementRate)}</Table.Cell>
            <Table.Cell numeric>{pctInt(r.skillMatch)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
