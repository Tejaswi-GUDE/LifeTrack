import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { pctInt } from '../../lib/format';

/**
 * Provider Performance comparison (government). Reuses the Government Dashboard
 * endpoint's `performance` block — no new API. Rows drill into the provider's
 * dashboard.
 */
export default function ProviderPerformance() {
  const [district, setDistrict] = useState('');
  const [mode, setMode] = useState('byProvider');
  const navigate = useNavigate();

  const { data, error, loading, reload } = useApi(
    '/dashboards/government',
    useMemo(() => ({ district: district || undefined }), [district]),
  );
  const districts = data?.scopeOptions?.districts || [];

  useTopbarActions(
    <select className="select" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District filter">
      <option value="">All districts</option>
      {districts.map((d) => <option key={d} value={d}>{d}</option>)}
    </select>,
    [district, districts.length],
  );

  if (error) return <ErrorState message="Couldn't load provider performance. Retry." onRetry={reload} />;
  if (loading && !data) return <Card><Skeleton height={240} /></Card>;
  if (!data) return null;

  const rows = mode === 'byProvider' ? data.performance.byProvider : data.performance.byDistrict;

  return (
    <Card>
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <h2 className="dash-section-title" style={{ margin: 0 }}>Provider &amp; district performance</h2>
        <Tabs
          items={[{ value: 'byProvider', label: 'By Provider' }, { value: 'byDistrict', label: 'By District' }]}
          value={mode}
          onChange={setMode}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState message="No providers in this scope." />
      ) : (
        <Table wrap>
          <Table.Head>
            <Table.Row>
              <Table.HeadCell>{mode === 'byProvider' ? 'Provider' : 'District'}</Table.HeadCell>
              {mode === 'byProvider' ? <Table.HeadCell>District</Table.HeadCell> : <Table.HeadCell numeric>Providers</Table.HeadCell>}
              <Table.HeadCell numeric>Trainees</Table.HeadCell>
              <Table.HeadCell numeric>Placement</Table.HeadCell>
              <Table.HeadCell numeric>Skill match</Table.HeadCell>
              <Table.HeadCell numeric>Confidence mix</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row
                key={row.id}
                onClick={() =>
                  mode === 'byProvider'
                    ? navigate(`/government/provider/${row.id}`)
                    : navigate(`/government/district/${encodeURIComponent(row.id)}`)
                }
              >
                <Table.Cell>{row.name}</Table.Cell>
                {mode === 'byProvider' ? <Table.Cell>{row.district}</Table.Cell> : <Table.Cell numeric>{row.providers}</Table.Cell>}
                <Table.Cell numeric>{row.trainees}</Table.Cell>
                <Table.Cell numeric style={{ color: row.placementRate != null && row.placementRate < 50 ? 'var(--brick)' : row.placementRate >= 75 ? 'var(--teal)' : undefined }}>
                  {pctInt(row.placementRate)}
                </Table.Cell>
                <Table.Cell numeric>{pctInt(row.skillMatch)}</Table.Cell>
                <Table.Cell numeric>
                  <span style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                    {row.confidenceMix.high > 0 && <Badge variant="outline-teal">{row.confidenceMix.high}H</Badge>}
                    {row.confidenceMix.medium > 0 && <Badge variant="outline-ochre">{row.confidenceMix.medium}M</Badge>}
                    {row.confidenceMix.low > 0 && <Badge variant="neutral">{row.confidenceMix.low}L</Badge>}
                  </span>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Card>
  );
}
