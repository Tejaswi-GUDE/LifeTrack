import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { pctInt, inr, fmtDate } from '../../lib/format';

const verifBadge = (s) =>
  s === 'confirmed'
    ? { variant: 'solid-teal', text: 'Verified' }
    : s === 'disputed'
      ? { variant: 'dashed-brick', text: 'Disputed' }
      : s === 'no_record'
        ? { variant: 'dashed-brick', text: 'No record' }
        : s === 'pending'
          ? { variant: 'neutral', text: 'Pending' }
          : { variant: 'neutral', text: 'Not sent' };

export default function EmployerDashboard() {
  const employer = useScopedEntity('employer');
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(
    employer.name ? '/dashboards/employer' : null,
    useMemo(() => ({ employer: employer.name }), [employer.name]),
  );

  useTopbarActions(employer.Switcher, [employer.name]);

  if (employer.error || error) {
    return <ErrorState message="Couldn't load the employer view. Retry." onRetry={reload} />;
  }
  if ((loading && !data) || (employer.loading && !employer.name)) {
    return (
      <>
        <div className="kpi-grid">{[0, 1, 2, 3, 4].map((i) => <div className="kpi-card" key={i}><Skeleton width="55%" height={12} /><div style={{ height: 10 }} /><Skeleton width="40%" height={26} /></div>)}</div>
        <Card><Skeleton height={200} /></Card>
      </>
    );
  }
  if (!data) return null;

  const { totals, hiring, employees, verificationRequests, skillRequirements, pendingActions } = data;

  return (
    <>
      {pendingActions > 0 && (
        <div className="alerts-row" style={{ marginBottom: 20 }}>
          <Alert
            tone="warning"
            title={`${pendingActions} verification request${pendingActions === 1 ? '' : 's'} need your response`}
            action={
              <Link to={`/employer/verify/${(verificationRequests.find((v) => v.status === 'pending') || {}).id || ''}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                Open the next request
              </Link>
            }
          >
            Confirming or disputing a hire keeps a trainee's outcome record accurate.
          </Alert>
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard label="Employees via LifeTrack" value={totals.employees} sub={`${totals.activeEmployees} currently active`} />
        <KpiCard label="Currently retained" value={totals.activeEmployees} sub={`${totals.pastEmployees} past`} />
        <KpiCard label="Verified hires" value={totals.verifiedEmployees} sub={`of ${hiring.placementsThroughLifetrack} placements`} />
        <KpiCard label="Pending verifications" value={totals.pendingVerifications} sub={totals.disputedVerifications ? `${totals.disputedVerifications} disputed` : 'nothing disputed'} tone={totals.pendingVerifications ? 'var(--ochre)' : undefined} />
        <KpiCard label="Retention rate" value={pctInt(hiring.retentionRate)} sub="active ÷ all placements" />
      </div>

      <Card title="Verification requests" subtitle="Confirm or dispute a reported hire">
        {verificationRequests.length === 0 ? (
          <EmptyState message="No verification requests for this employer." />
        ) : (
          <Table wrap>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Candidate</Table.HeadCell>
                <Table.HeadCell>Claimed role</Table.HeadCell>
                <Table.HeadCell>Claimed join date</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
                <Table.HeadCell> </Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {verificationRequests.map((v) => {
                const b = verifBadge(v.status);
                return (
                  <Table.Row key={v.id}>
                    <Table.Cell>{v.traineeName}</Table.Cell>
                    <Table.Cell>{v.claimRole || '—'}</Table.Cell>
                    <Table.Cell>{v.claimJoinDate ? fmtDate(v.claimJoinDate) : '—'}</Table.Cell>
                    <Table.Cell><Badge variant={b.variant}>{b.text}</Badge></Table.Cell>
                    <Table.Cell>
                      <Link
                        to={`/employer/verify/${v.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        {v.status === 'pending' ? 'Respond' : 'View'}
                      </Link>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </Card>

      <div style={{ height: 20 }} />

      <Card title="Employees & outcomes" subtitle="Trainees hired by this employer">
        {employees.length === 0 ? (
          <EmptyState message="No employment records for this employer yet." />
        ) : (
          <Table wrap>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell>Name</Table.HeadCell>
                <Table.HeadCell>Role</Table.HeadCell>
                <Table.HeadCell>Since</Table.HeadCell>
                <Table.HeadCell>Verification</Table.HeadCell>
                <Table.HeadCell numeric>Skill match</Table.HeadCell>
                <Table.HeadCell numeric>Wage</Table.HeadCell>
                <Table.HeadCell>Status</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {employees.map((e, i) => (
                <Table.Row key={`${e.traineeId}-${i}`} onClick={() => navigate(`/provider/trainee/${e.traineeId}`)}>
                  <Table.Cell>{e.name}</Table.Cell>
                  <Table.Cell>{e.occupation}</Table.Cell>
                  <Table.Cell>{e.startDate ? fmtDate(e.startDate) : '—'}</Table.Cell>
                  <Table.Cell><Badge variant={verifBadge(e.verificationStatus).variant}>{verifBadge(e.verificationStatus).text}</Badge></Table.Cell>
                  <Table.Cell numeric>{e.skillMatch ? `${e.skillMatch.score}%` : '—'}</Table.Cell>
                  <Table.Cell numeric>{e.wage ? inr(e.wage.latest) : '—'}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={e.isActive ? 'outline-teal' : 'neutral'}>{e.isActive ? 'Active' : 'Exited'}</Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Card>

      <div style={{ height: 20 }} />

      <Card title="Skill requirements" subtitle="What the roles you hire for need — and where training falls short">
        {skillRequirements.length === 0 ? (
          <EmptyState message="No occupations on record for this employer." />
        ) : (
          <div className="dash-grid-2" style={{ marginBottom: 0 }}>
            {skillRequirements.map((r) => (
              <div className="card" key={r.occupation} style={{ padding: 16 }}>
                <div className="card-title">{r.occupation}</div>
                <div className="card-sub">
                  {r.hires} hire{r.hires === 1 ? '' : 's'} · avg skill match {r.avgSkillMatch != null ? `${r.avgSkillMatch}%` : '—'}
                </div>
                <div style={{ marginTop: 8 }}>
                  {r.requiredSkills.map((s) => (
                    <span
                      key={s}
                      className="chip-skill"
                      style={
                        r.gapSkills.some((g) => g.skill === s)
                          ? undefined
                          : { background: 'var(--teal-tint)', color: 'var(--teal)' }
                      }
                    >
                      {s}
                    </span>
                  ))}
                </div>
                {r.gapSkills.length > 0 && (
                  <div className="card-sub" style={{ marginTop: 8 }}>
                    Gap: <strong style={{ color: 'var(--brick)' }}>{r.gapSkills.map((g) => `${g.skill}${g.count > 1 ? ` (${g.count})` : ''}`).join(', ')}</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
