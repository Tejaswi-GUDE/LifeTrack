import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useSession } from './context/SessionContext';
import { roleHome } from './config/nav';
import AppShell from './components/shell/AppShell';
import Login from './pages/Login';
import UIShowcase from './pages/UIShowcase';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import AdminSeed from './pages/admin/Seed';

import GovernmentDashboard from './pages/government/Dashboard';
import OutcomeAnalytics from './pages/government/Analytics';
import ProviderPerformance from './pages/government/ProviderPerformance';
import SkillIntelligence from './pages/government/SkillIntelligence';

import ProviderDashboard from './pages/provider/Dashboard';
import InterventionLog from './pages/provider/InterventionLog';
import CourseSkillGap from './pages/provider/CourseSkillGap';

import TraineeDirectory from './pages/trainee/Directory';
import TraineeProfile from './pages/trainee/Profile';
import TraineeHome from './pages/trainee/Home';
import CareerTimeline from './pages/trainee/CareerTimeline';
import Consent from './pages/trainee/Consent';
import FollowupForm from './pages/trainee/FollowupForm';

import RiskCenter from './pages/counsellor/RiskCenter';
import FollowupsQueue from './pages/shared/FollowupsQueue';

import EmployerDashboard from './pages/employer/Dashboard';
import EmployerVerify from './pages/employer/Verify';

function RootRedirect() {
  const { session } = useSession();
  return <Navigate to={session ? roleHome(session.role) : '/login'} replace />;
}

// Government viewing one provider reuses the Provider Dashboard, scoped by
// the route param instead of the session.
function GovernmentProviderDetail() {
  const { providerId } = useParams();
  return <ProviderDashboard providerIdOverride={providerId} />;
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
        <Route path="/government/analytics" element={<OutcomeAnalytics />} />
        <Route path="/government/district/:districtId" element={<OutcomeAnalytics />} />
        <Route path="/government/providers" element={<ProviderPerformance />} />
        <Route path="/government/provider-comparison" element={<ProviderPerformance />} />
        <Route path="/government/provider/:providerId" element={<GovernmentProviderDetail />} />
        <Route path="/government/skill-intelligence" element={<SkillIntelligence />} />
        <Route path="/government/settings" element={<Settings />} />
        <Route path="/admin/seed" element={<AdminSeed />} />

        {/* Provider */}
        <Route path="/provider/dashboard" element={<ProviderDashboard />} />
        <Route path="/provider/trainees" element={<TraineeDirectory />} />
        <Route path="/provider/trainee/:id" element={<TraineeProfile />} />
        <Route path="/provider/followups" element={<FollowupsQueue />} />
        <Route path="/provider/risk" element={<RiskCenter />} />
        <Route path="/provider/interventions" element={<InterventionLog />} />
        <Route path="/provider/skill-gaps" element={<CourseSkillGap />} />
        <Route path="/provider/course/:id/skill-gap" element={<CourseSkillGap />} />
        <Route path="/provider/analytics" element={<OutcomeAnalytics />} />
        <Route path="/provider/settings" element={<Settings />} />

        {/* Counsellor */}
        <Route path="/counsellor/worklist" element={<RiskCenter />} />
        <Route path="/counsellor/trainees" element={<TraineeDirectory />} />
        <Route path="/counsellor/trainee/:id" element={<TraineeProfile />} />
        <Route path="/counsellor/followups" element={<FollowupsQueue />} />
        <Route path="/counsellor/settings" element={<Settings />} />

        {/* Trainee */}
        <Route path="/trainee/home" element={<TraineeHome />} />
        <Route path="/trainee/timeline" element={<CareerTimeline />} />
        <Route path="/trainee/followups" element={<FollowupsQueue />} />
        <Route path="/trainee/followup/:scheduleId" element={<FollowupForm />} />
        <Route path="/trainee/consent" element={<Consent />} />

        {/* Employer */}
        <Route path="/employer/dashboard" element={<EmployerDashboard />} />
        <Route path="/employer/verifications" element={<EmployerDashboard />} />
        <Route path="/employer/settings" element={<Settings />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
