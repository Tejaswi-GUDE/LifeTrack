import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { apiSend } from '../../api/client';
import { useScopedEntity } from '../../hooks/useScopedEntity';
import { useTopbarActions } from '../../components/shell/TopbarSlot';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Loading';
import { fmtDate } from '../../lib/format';

const PURPOSE_BLURB = {
  data_collection: 'Lets LifeTrack keep a record of your training and livelihood outcomes over time.',
  employer_contact: 'Lets LifeTrack contact an employer to confirm a job you have reported.',
  analytics: 'Lets your de-identified outcomes be used in district and policy reporting.',
};

export default function Consent() {
  const trainee = useScopedEntity('trainee');
  const { data, error, loading, reload } = useApi(trainee.id ? `/trainees/${trainee.id}` : null);
  const [saving, setSaving] = useState(null);
  const [saveError, setSaveError] = useState(null);

  useTopbarActions(trainee.Switcher, [trainee.id]);

  if (trainee.error || error) return <ErrorState message="Couldn't load your consent settings. Retry." onRetry={reload} />;
  if ((loading && !data) || (trainee.loading && !trainee.id)) {
    return <Card><Skeleton height={220} /></Card>;
  }
  if (!data) return null;

  const toggle = async (purpose, next) => {
    setSaving(purpose);
    setSaveError(null);
    try {
      await apiSend('PATCH', `/trainees/${trainee.id}/consent`, { purpose, granted: next });
      reload();
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <Card title="Consent controls" subtitle="You choose what LifeTrack may do with your data. Every change is versioned and logged.">
        {(data.consent || []).map((c) => (
          <div key={c.purpose} style={{ padding: '14px 0', borderBottom: '1px solid var(--slate-10)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.displayLabel}</div>
                <div className="dash-note" style={{ marginTop: 2 }}>{PURPOSE_BLURB[c.purpose]}</div>
                {c.since && <div className="dash-note">Last updated {fmtDate(c.since)}</div>}
              </div>
              <Button
                variant={c.granted ? 'secondary' : 'primary'}
                size="sm"
                loading={saving === c.purpose}
                onClick={() => toggle(c.purpose, !c.granted)}
              >
                {c.granted ? 'Revoke' : 'Grant'}
              </Button>
            </div>
          </div>
        ))}
        {saveError && (
          <p className="dash-note" style={{ color: 'var(--brick)', marginTop: 12 }}>{saveError}</p>
        )}
        <p className="dash-note" style={{ marginTop: 14 }}>
          Revoking data collection stops future follow-ups. Existing verified records are kept but not
          shared further.
        </p>
      </Card>
    </div>
  );
}
