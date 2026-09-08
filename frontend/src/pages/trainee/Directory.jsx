import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useSession } from '../../context/SessionContext';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import RiskBadge from '../../components/ui/RiskBadge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['employed', 'Employed'],
  ['self_employed', 'Self-employed'],
  ['apprentice', 'Apprentice'],
  ['unemployed', 'Unemployed'],
  ['job_lost', 'Job lost'],
  ['not_responding', 'Not responding'],
  ['certified_no_outcome', 'Certified — no outcome'],
];
const RISK_OPTIONS = [
  ['', 'All risk'],
  ['high', 'High'],
  ['medium', 'Medium'],
  ['low', 'Low'],
];

export default function TraineeDirectory() {
  const { role } = useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [risk, setRisk] = useState('');

  const params = useMemo(
    () => ({ status: status || undefined, risk: risk || undefined }),
    [status, risk],
  );
  const { data, error, loading, reload } = useApi('/trainees', params);

  const base = role === 'counsellor' ? '/counsellor/trainee/' : '/provider/trainee/';

  useTopbarActions(
    <>
      <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
        {STATUS_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <select className="select" value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Risk band">
        {RISK_OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </>,
    [status, risk],
  );

  if (error) return <ErrorState message="Couldn't load the trainee list. Retry." onRetry={reload} />;

  if (loading && !data) {
    return (
      <Card title="Trainees">
        <Skeleton height={40} />
        <div style={{ height: 8 }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Skeleton height={44} />
            <div style={{ height: 6 }} />
          </div>
        ))}
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card title="Trainees" subtitle={`${data.count} tracked · sorted by outcome risk`}>
      {data.trainees.length === 0 ? (
        <EmptyState message="No trainees match this filter." />
      ) : (
        <Table wrap>
          <Table.Head>
            <Table.Row>
              <Table.HeadCell>Name</Table.HeadCell>
              <Table.HeadCell>Course</Table.HeadCell>
              <Table.HeadCell>District</Table.HeadCell>
              <Table.HeadCell>Status</Table.HeadCell>
              <Table.HeadCell numeric>Outcome risk</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {data.trainees.map((t) => (
              <Table.Row key={t.id} onClick={() => navigate(base + t.id)}>
                <Table.Cell>{t.name}</Table.Cell>
                <Table.Cell>{t.course}</Table.Cell>
                <Table.Cell>{t.district}</Table.Cell>
                <Table.Cell>
                  <StatusBadge status={t.currentStatus} confidence={t.currentConfidence} />
                </Table.Cell>
                <Table.Cell numeric>
                  <RiskBadge score={t.outcomeRisk.score} band={t.outcomeRisk.band} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Card>
  );
}
