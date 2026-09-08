import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Badge from '../../components/ui/Badge';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import Timeline from '../../components/Timeline';

/** Trainee's own full career timeline (self-view of the profile timeline). */
export default function CareerTimeline() {
  const trainee = useScopedEntity('trainee');
  const { data, error, loading, reload } = useApi(trainee.id ? `/trainees/${trainee.id}` : null);

  useTopbarActions(trainee.Switcher, [trainee.id]);

  if (trainee.error || error) return <ErrorState message="Couldn't load your timeline. Retry." onRetry={reload} />;
  if ((loading && !data) || (trainee.loading && !trainee.id)) {
    return <Card><Skeleton width="40%" height={20} /><div style={{ height: 20 }} /><Skeleton height={420} /></Card>;
  }
  if (!data) return null;

  const t = data.trainee;
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 20 }}>{t.name}</span>
          <StatusBadge status={t.currentStatus} confidence={t.currentConfidence} />
          <Badge variant="neutral">Confidence: {t.currentConfidenceLabel}</Badge>
        </div>
        <Link to="/trainee/home" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
          ← Back to My Career
        </Link>
      </div>
      <Timeline timeline={data.timeline} title={null} />
    </Card>
  );
}
