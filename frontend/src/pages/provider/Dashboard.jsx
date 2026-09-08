import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import RiskBadge from '../../components/ui/RiskBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { MiniBars, StackedBar, TrendLine } from '../../components/charts';
import { pctInt, inr, cap, fmtDate, reasonColor } from '../../lib/format';

function DashSkeleton() {
  return (
    <>
      <div className="kpi-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="kpi-card" key={i}>
            <Skeleton width="60%" height={12} />
            <div style={{ height: 10 }} />
            <Skeleton width="45%" height={26} />
          </div>
        ))}
      </div>
      <div className="dash-grid-1-2">
        <Card><Skeleton height={200} /></Card>
        <Card><Skeleton height={200} /></Card>
      </div>
    </>
  );
}

export default function ProviderDashboard({ providerIdOverride }) {
  const scoped = useScopedEntity(providerIdOverride ? 'noop' : 'provider');
  const providerId = providerIdOverride || scoped.id;
  const [courseId, setCourseId] = useState('');
  const navigate = useNavigate();

  const { data, error, loading, reload } = useApi(
    providerId ? `/dashboards/provider/${providerId}` : null,
    useMemo(() => ({ courseId: courseId || undefined }), [courseId]),
  );

  const courses = data?.filterOptions?.courses || [];

  useTopbarActions(
    <>
      {!providerIdOverride && scoped.Switcher}
      <select className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Course filter">
        <option value="">All courses</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </>,
    [providerId, courseId, courses.length, providerIdOverride],
  );

  const scopeLoading = providerIdOverride ? false : scoped.loading;

  if (scoped.error || error) {
    return <ErrorState message="Couldn't load the provider dashboard. Retry." onRetry={reload} />;
  }
  if ((loading && !data) || (scopeLoading && !providerId)) return <DashSkeleton />;
  if (!data) return null;

  const { totals, kpis, cohorts, outcomeMix, wageTrend, nonPlacement, skillGaps, atRisk, recentInterventions } = data;

  if (totals.trainees === 0) {
    return <EmptyState message="No trainees are recorded for this provider yet." />;
  }

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="Trainees" value={totals.trainees} sub={`${totals.certified} certified`} />
        <KpiCard label="Completion rate" value={pctInt(kpis.completionRate.value)} sub={`${kpis.completionRate.numerator} of ${kpis.completionRate.denominator}`} />
        <KpiCard label="Placement rate" value={pctInt(kpis.placementRate.value)} sub={`${kpis.placementRate.numerator} of ${kpis.placementRate.denominator} certified`} />
        <KpiCard label="Retention rate" value={pctInt(kpis.retentionRate.value)} sub={`${kpis.retentionRate.numerator} of ${kpis.retentionRate.denominator} ever-employed`} />
        <KpiCard label="Avg. skill match" value={pctInt(kpis.skillMatch.value)} sub={`across ${kpis.skillMatch.sampleSize} working trainees`} />
        <KpiCard label="Follow-up response" value={pctInt(kpis.followupResponseRate.value)} sub={`${kpis.followupResponseRate.numerator} of ${kpis.followupResponseRate.denominator} due`} />
      </div>

      <div className="dash-grid-1-2">
        <Card>
          <h2 className="dash-section-title">Cohort &amp; course performance</h2>
          {cohorts.length === 0 ? (
            <EmptyState message="No course cohorts to compare." />
          ) : (
            <Table wrap>
              <Table.Head>
                <Table.Row>
                  <Table.HeadCell>Course</Table.HeadCell>
                  <Table.HeadCell numeric>Trainees</Table.HeadCell>
                  <Table.HeadCell numeric>Completion</Table.HeadCell>
                  <Table.HeadCell numeric>Placement</Table.HeadCell>
                  <Table.HeadCell numeric>Retention</Table.HeadCell>
                  <Table.HeadCell numeric>Skill match</Table.HeadCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {cohorts.map((c) => (
                  <Table.Row key={c.id} onClick={() => navigate(`/provider/course/${c.id}/skill-gap`)}>
                    <Table.Cell>{c.name}</Table.Cell>
                    <Table.Cell numeric>{c.trainees}</Table.Cell>
                    <Table.Cell numeric>{pctInt(c.completionRate)}</Table.Cell>
                    <Table.Cell numeric style={{ color: c.placementRate != null && c.placementRate < 50 ? 'var(--brick)' : c.placementRate >= 75 ? 'var(--teal)' : undefined }}>
                      {pctInt(c.placementRate)}
                    </Table.Cell>
                    <Table.Cell numeric>{pctInt(c.retentionRate)}</Table.Cell>
                    <Table.Cell numeric>{pctInt(c.skillMatch)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card>

        <div className="two-col-right" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="Outcome mix" subtitle={`${totals.trainees} trainees`}>
            <StackedBar
              segments={outcomeMix.map((m) => ({
                label: m.label,
                value: m.count,
                color:
                  m.status === 'employed' ? 'var(--teal)'
                    : m.status === 'self_employed' || m.status === 'apprentice' ? 'var(--teal)'
                      : m.status === 'job_lost' ? 'var(--brick)'
                        : m.status === 'unemployed' || m.status === 'not_responding' ? 'var(--ochre)'
                          : 'var(--slate-30)',
              }))}
            />
          </Card>
          <Card title="Wage progression" subtitle="Average income by checkpoint">
            <TrendLine
              points={wageTrend.map((w) => ({ x: `D${w.checkpointDay}`, y: w.avgIncome }))}
              formatX={(x) => x}
              formatY={(y) => inr(y)}
            />
          </Card>
        </div>
      </div>

      <div className="dash-grid-2">
        <Card>
          <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 className="dash-section-title" style={{ margin: 0 }}>Trainees requiring attention</h2>
            <Link to="/provider/risk" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
              Risk &amp; Intervention Center →
            </Link>
          </div>
          {atRisk.length === 0 ? (
            <EmptyState message="No trainees are currently flagged for attention." />
          ) : (
            <Table wrap>
              <Table.Head>
                <Table.Row>
                  <Table.HeadCell>Trainee</Table.HeadCell>
                  <Table.HeadCell>Root cause</Table.HeadCell>
                  <Table.HeadCell numeric>Days since cert.</Table.HeadCell>
                  <Table.HeadCell numeric>Risk</Table.HeadCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {atRisk.map((t) => (
                  <Table.Row key={t.id} onClick={() => navigate(`/provider/trainee/${t.id}`)}>
                    <Table.Cell>
                      <div>{t.name}</div>
                      <div className="dl-sub">{t.course} · {t.currentStatusLabel}</div>
                    </Table.Cell>
                    <Table.Cell>{t.rootCause || '—'}</Table.Cell>
                    <Table.Cell numeric>{t.daysSinceCertification ?? '—'}</Table.Cell>
                    <Table.Cell numeric>
                      <RiskBadge score={t.riskScore} band={t.riskBand} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Card>

        <div className="two-col-right" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card title="Non-placement reasons" subtitle={`Among ${nonPlacement.total} unplaced / non-responsive`}>
            {nonPlacement.total === 0 ? (
              <EmptyState message="No unplaced trainees for this provider." />
            ) : (
              <StackedBar
                segments={nonPlacement.reasons.map((r) => ({
                  label: `${r.displayLabel}${r.source === 'inferred' ? ' (inferred)' : ''}`,
                  value: r.count,
                  color: reasonColor(r.label),
                }))}
              />
            )}
          </Card>
          <Card title="Skill-gap indicators" subtitle="Most frequently missing skills">
            {skillGaps.length === 0 ? (
              <EmptyState message="No skill gaps detected in this scope." />
            ) : (
              <MiniBars
                data={skillGaps.slice(0, 6).map((g) => ({ label: g.skill, value: g.affectedTrainees, color: 'var(--ochre)' }))}
                formatValue={(v) => `${v}`}
              />
            )}
            <div className="dash-note">
              <Link to="/provider/skill-gaps" style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
                Course skill-gap report →
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Recent interventions" subtitle="Latest actions across this provider's trainees">
        {recentInterventions.length === 0 ? (
          <EmptyState message="No interventions have been logged yet." />
        ) : (
          recentInterventions.map((iv) => (
            <div className="dash-list-row" key={iv.id}>
              <div>
                <Link to={`/provider/trainee/${iv.traineeId}`} style={{ fontWeight: 500, color: 'var(--ink)', textDecoration: 'none' }}>
                  {iv.traineeName}
                </Link>
                <div className="dl-sub">
                  {iv.displayType} · {fmtDate(iv.updatedAt)}
                </div>
              </div>
              <Badge
                variant={
                  iv.status === 'completed' ? 'outline-teal'
                    : iv.status === 'in_progress' ? 'outline-ochre'
                      : iv.status === 'dismissed' ? 'neutral'
                        : 'outline-ochre'
                }
              >
                {cap(iv.status.replace('_', ' '))}
              </Badge>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
