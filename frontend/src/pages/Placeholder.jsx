import { useParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

/**
 * Placeholder screen rendered inside <AppShell>. The topbar already shows
 * this route's crumb + title (from config/nav.js), so the body just states
 * that the screen is pending. Business screens replace these later.
 */
export default function Placeholder() {
  const params = useParams();
  const paramEntries = Object.entries(params);

  return (
    <Card
      title="Screen not built yet"
      subtitle="Application shell step — navigation and routing only."
    >
      <EmptyState message="This screen will be implemented in a later step, using real backend data." />
      {paramEntries.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--slate)' }}>
          Route params:{' '}
          <code style={{ fontFamily: 'var(--mono)' }}>
            {paramEntries.map(([k, v]) => `${k}=${v}`).join('  ')}
          </code>
        </div>
      )}
    </Card>
  );
}
