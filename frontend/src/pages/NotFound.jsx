import { Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { roleHome } from '../config/nav';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

/**
 * Rendered inside <AppShell> for any unmatched in-app path.
 */
export default function NotFound() {
  const { role } = useSession();
  return (
    <Card title="Page not found">
      <EmptyState message="There's no screen at this address." />
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <Link to={roleHome(role)} style={{ fontWeight: 600 }}>
          Back to your home
        </Link>
      </div>
    </Card>
  );
}
