import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { fmtDate, cap } from '../../lib/format';

const STATUS_VARIANT = {
  recommended: 'outline-ochre',
  in_progress: 'outline-ochre',
  completed: 'outline-teal',
  dismissed: 'neutral',
};

export default function InterventionLog() {
  const provider = useScopedEntity('provider');
  const navigate = useNavigate();
  const [status, setStatus] = useState('all');

  const { data, error, loading, reload } = useApi(
    provider.id ? '/interventions' : null,
    useMemo(() => ({ providerId: provider.id || undefined, status: status === 'all' ? undefined : status }), [provider.id, status]),
  );

  useTopbarActions(provider.Switcher, [provider.id]);

  if (provider.error || error) return <ErrorState message="Couldn't load the intervention log. Retry." onRetry={reload} />;
  if ((loading && !data) || (provider.loading && !provider.id)) {
    return <Card><Skeleton height={40} /><div style={{ height: 8 }} />{[0, 1, 2, 3].map((i) => <div key={i}><Skeleton height={44} /><div style={{ height: 6 }} /></div>)}</Card>;
  }
  if (!data) return null;

  const c = data.counts || {};

  return (
    <Card>
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <h2 className="dash-section-title" style={{ margin: 0 }}>
          {data.count} intervention{data.count === 1 ? '' : 's'}
          <span className="dash-note" style={{ marginLeft: 8 }}>
            {c.recommended || 0} awaiting · {c.in_progress || 0} in progress · {c.completed || 0} completed · {c.dismissed || 0} dismissed
          </span>
        </h2>
        <Tabs
          items={[
            { value: 'all', label: 'All' },
            { value: 'recommended', label: 'Awaiting' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'dismissed', label: 'Dismissed' },
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>

      {data.interventions.length === 0 ? (
        <EmptyState message="No interventions in this view." />
      ) : (
        <Table wrap>
          <Table.Head>
            <Table.Row>
              <Table.HeadCell>Trainee</Table.HeadCell>
              <Table.HeadCell>Intervention</Table.HeadCell>
              <Table.HeadCell>Recommended by</Table.HeadCell>
              <Table.HeadCell>Updated</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {data.interventions.map((iv) => (
              <Table.Row key={iv.id} onClick={() => navigate(`/provider/trainee/${iv.traineeId}`)}>
                <Table.Cell>
                  <div>{iv.traineeName}</div>
                  <div className="dl-sub">{iv.course} · {iv.currentStatusLabel}</div>
                </Table.Cell>
                <Table.Cell>
                  <div>{iv.displayType}</div>
                  {iv.rationale && <div className="dl-sub" style={{ maxWidth: 360 }}>{iv.rationale}</div>}
                </Table.Cell>
                <Table.Cell>{cap(iv.recommendedBy)}</Table.Cell>
                <Table.Cell>{fmtDate(iv.updatedAt)}</Table.Cell>
                <Table.Cell><Badge variant={STATUS_VARIANT[iv.status] || 'neutral'}>{cap(iv.status.replace('_', ' '))}</Badge></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Card>
  );
}
