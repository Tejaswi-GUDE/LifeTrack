import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useSession } from '../../context/SessionContext';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { fmtDate } from '../../lib/format';

const STATUS_BADGE = {
  due: { variant: 'outline-ochre', label: 'Due' },
  non_responsive: { variant: 'outline-brick', label: 'No response' },
  scheduled: { variant: 'neutral', label: 'Scheduled' },
  completed: { variant: 'outline-teal', label: 'Completed' },
};

/**
 * Follow-up queue — shared by provider / counsellor / trainee. Scope comes
 * from the role: provider → their trainees, trainee → their own, counsellor →
 * all. Rows open the conversational check-in (trainee) or the trainee profile.
 */
export default function FollowupsQueue() {
  const { role } = useSession();
  const navigate = useNavigate();
  const provider = useScopedEntity(role === 'provider' ? 'provider' : 'noop');
  const trainee = useScopedEntity(role === 'trainee' ? 'trainee' : 'noop');
  const [filter, setFilter] = useState('all');

  const scopeParams = useMemo(() => {
    if (role === 'provider') return { providerId: provider.id || undefined };
    if (role === 'trainee') return { traineeId: trainee.id || undefined };
    return {};
  }, [role, provider.id, trainee.id]);

  const waitingForScope =
    (role === 'provider' && !provider.id) || (role === 'trainee' && !trainee.id);

  const { data, error, loading, reload } = useApi(waitingForScope ? null : '/followups', scopeParams);

  useTopbarActions(
    role === 'provider' ? provider.Switcher : role === 'trainee' ? trainee.Switcher : null,
    [provider.id, trainee.id, role],
  );

  if (error) return <ErrorState message="Couldn't load follow-ups. Retry." onRetry={reload} />;
  if ((loading && !data) || waitingForScope) {
    return <Card><Skeleton height={40} /><div style={{ height: 8 }} />{[0, 1, 2, 3, 4].map((i) => <div key={i}><Skeleton height={44} /><div style={{ height: 6 }} /></div>)}</Card>;
  }
  if (!data) return null;

  const rows = filter === 'all' ? data.followups : data.followups.filter((f) => f.status === filter);
  const c = data.counts || {};

  return (
    <Card>
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <h2 className="dash-section-title" style={{ margin: 0 }}>
          {data.count} follow-up{data.count === 1 ? '' : 's'}
          <span className="dash-note" style={{ marginLeft: 8 }}>
            {c.due || 0} due · {c.non_responsive || 0} no response · {c.scheduled || 0} scheduled · {c.completed || 0} done
          </span>
        </h2>
        <Tabs
          items={[
            { value: 'all', label: 'All' },
            { value: 'due', label: 'Due' },
            { value: 'non_responsive', label: 'No response' },
            { value: 'scheduled', label: 'Upcoming' },
            { value: 'completed', label: 'Done' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No follow-ups in this view." />
      ) : (
        <Table wrap>
          <Table.Head>
            <Table.Row>
              {role !== 'trainee' && <Table.HeadCell>Trainee</Table.HeadCell>}
              <Table.HeadCell numeric>Checkpoint</Table.HeadCell>
              <Table.HeadCell>Scheduled</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell> </Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map((f) => {
              const b = STATUS_BADGE[f.status] || STATUS_BADGE.scheduled;
              const canAnswer = role === 'trainee' && (f.status === 'due' || f.status === 'scheduled');
              return (
                <Table.Row
                  key={f.id}
                  onClick={() =>
                    role === 'trainee'
                      ? navigate(`/trainee/followup/${f.id}`)
                      : navigate(`/${role === 'counsellor' ? 'counsellor' : 'provider'}/trainee/${f.traineeId}`)
                  }
                >
                  {role !== 'trainee' && (
                    <Table.Cell>
                      <div>{f.traineeName}</div>
                      <div className="dl-sub">{f.course}</div>
                    </Table.Cell>
                  )}
                  <Table.Cell numeric>Day {f.checkpointDay}</Table.Cell>
                  <Table.Cell>{fmtDate(f.scheduledDate)}</Table.Cell>
                  <Table.Cell><Badge variant={b.variant}>{b.label}</Badge></Table.Cell>
                  <Table.Cell>
                    {canAnswer ? (
                      <span className="btn btn-ghost btn-sm">Answer →</span>
                    ) : f.respondedAt ? (
                      <span className="dl-sub">{f.channel} · {fmtDate(f.respondedAt)}</span>
                    ) : (
                      <span className="dl-sub">—</span>
                    )}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )}
    </Card>
  );
}
