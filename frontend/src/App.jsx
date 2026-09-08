import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './context/SessionContext';
import { roleHome } from './config/nav';
import AppShell from './components/shell/AppShell';
import Login from './pages/Login';
import EmployerVerify from './pages/EmployerVerify';
import UIShowcase from './pages/UIShowcase';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';
import GovernmentDashboard from './pages/government/Dashboard';
import TraineeDirectory from './pages/trainee/Directory';
import TraineeProfile from './pages/trainee/Profile';
import RiskCenter from './pages/counsellor/RiskCenter';

/**
 * Route tree. Everything in-app renders inside <AppShell> (one persistent
 * product frame). Login, the link-based Employer Verification screen, and the
 * /ui primitives catalogue sit outside the shell. Product screens are
 * Placeholders for now — the shell step only wires navigation + routing.
 */
function RootRedirect() {
  const { session } = useSession();
  return <Navigate to={session ? roleHome(session.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/employer/verify/:verificationId" element={<EmployerVerify />} />
      <Route path="/ui" element={<UIShowcase />} />

      <Route element={<AppShell />}>
        {/* Government */}
        <Route path="/government/dashboard" element={<GovernmentDashboard />} />
        <Route path="/government/providers" element={<Placeholder />} />
        <Route path="/government/provider-comparison" element={<Placeholder />} />
        <Route path="/government/provider/:providerId" element={<Placeholder />} />
        <Route path="/government/skill-intelligence" element={<Placeholder />} />
        <Route path="/government/district/:districtId" element={<Placeholder />} />
        <Route path="/government/analytics" element={<Placeholder />} />
        <Route path="/government/settings" element={<Placeholder />} />
        <Route path="/admin/seed" element={<Placeholder />} />

        {/* Provider */}
        <Route path="/provider/dashboard" element={<Placeholder />} />
        <Route path="/provider/trainees" element={<TraineeDirectory />} />
        <Route path="/provider/trainee/:id" element={<TraineeProfile />} />
        <Route path="/provider/followups" element={<Placeholder />} />
        <Route path="/provider/risk" element={<Placeholder />} />
        <Route path="/provider/interventions" element={<Placeholder />} />
        <Route path="/provider/skill-gaps" element={<Placeholder />} />
        <Route path="/provider/course/:id/skill-gap" element={<Placeholder />} />
        <Route path="/provider/analytics" element={<Placeholder />} />
        <Route path="/provider/settings" element={<Placeholder />} />

        {/* Counsellor */}
        <Route path="/counsellor/worklist" element={<RiskCenter />} />
        <Route path="/counsellor/trainees" element={<TraineeDirectory />} />
        <Route path="/counsellor/trainee/:id" element={<TraineeProfile />} />
        <Route path="/counsellor/followups" element={<Placeholder />} />
        <Route path="/counsellor/settings" element={<Placeholder />} />

        {/* Trainee */}
        <Route path="/trainee/home" element={<Placeholder />} />
        <Route path="/trainee/timeline" element={<Placeholder />} />
        <Route path="/trainee/followups" element={<Placeholder />} />
        <Route path="/trainee/followup/:scheduleId" element={<Placeholder />} />
        <Route path="/trainee/consent" element={<Placeholder />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
