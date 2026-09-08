/**
 * Role-aware navigation + page metadata for the application shell.
 *
 * The canonical MVP areas are: Overview, Trainees, Providers, Follow-ups,
 * Risk & Interventions, Skill Intelligence, Analytics, Settings / Consent.
 * Each role sees the subset its RBAC scope allows (PRD §20 / Build Spec §2).
 * Every item below leads to an implemented screen.
 */

export const ROLE_LABEL = {
  government: 'Government / Policymaker',
  provider: 'Training Provider',
  counsellor: 'Counsellor',
  trainee: 'Trainee',
  employer: 'Employer',
};

const NAV_BY_ROLE = {
  government: [
    { label: 'Overview', to: '/government/dashboard' },
    {
      label: 'Providers',
      to: '/government/providers',
      match: ['/government/providers', '/government/provider-comparison', '/government/provider'],
    },
    {
      label: 'Skill Intelligence',
      to: '/government/skill-intelligence',
      match: ['/government/skill-intelligence'],
    },
    { label: 'Analytics', to: '/government/analytics', match: ['/government/analytics', '/government/district'] },
    {
      label: 'Settings / Consent',
      to: '/government/settings',
      match: ['/government/settings', '/admin/seed'],
    },
  ],
  provider: [
    { label: 'Overview', to: '/provider/dashboard' },
    { label: 'Trainees', to: '/provider/trainees', match: ['/provider/trainees', '/provider/trainee'] },
    { label: 'Follow-ups', to: '/provider/followups' },
    {
      label: 'Risk & Interventions',
      to: '/provider/risk',
      match: ['/provider/risk', '/provider/interventions'],
    },
    {
      label: 'Skill Intelligence',
      to: '/provider/skill-gaps',
      match: ['/provider/skill-gaps', '/provider/course'],
    },
    { label: 'Analytics', to: '/provider/analytics' },
    { label: 'Settings / Consent', to: '/provider/settings' },
  ],
  counsellor: [
    { label: 'Risk & Interventions', to: '/counsellor/worklist' },
    { label: 'Trainees', to: '/counsellor/trainees', match: ['/counsellor/trainees', '/counsellor/trainee'] },
    { label: 'Follow-ups', to: '/counsellor/followups' },
    { label: 'Settings / Consent', to: '/counsellor/settings' },
  ],
  trainee: [
    { label: 'Overview', to: '/trainee/home' },
    { label: 'Career Timeline', to: '/trainee/timeline' },
    { label: 'Follow-ups', to: '/trainee/followups', match: ['/trainee/followups', '/trainee/followup'] },
    { label: 'Consent', to: '/trainee/consent' },
  ],
  employer: [
    { label: 'Overview', to: '/employer/dashboard' },
    { label: 'Verification Requests', to: '/employer/verifications', match: ['/employer/verifications', '/employer/verify'] },
    { label: 'Settings', to: '/employer/settings' },
  ],
};

export function navForRole(role) {
  return (NAV_BY_ROLE[role] || []).map((it) => ({ key: it.to, ...it }));
}

export function roleHome(role) {
  return (NAV_BY_ROLE[role] && NAV_BY_ROLE[role][0].to) || '/login';
}

export function settingsRouteForRole(role) {
  if (role === 'trainee') return '/trainee/consent';
  if (role && NAV_BY_ROLE[role]) return NAV_BY_ROLE[role].find((n) => /Settings/.test(n.label))?.to || `/${role}/settings`;
  return '/login';
}

// --- Page metadata: crumb (nav area) + H1 title, shown in the topbar ------
const META_EXACT = {
  // government
  '/government/dashboard': { crumb: 'Overview', title: 'Skilling Outcomes' },
  '/government/providers': { crumb: 'Providers', title: 'Provider Performance' },
  '/government/provider-comparison': { crumb: 'Providers', title: 'Provider Performance' },
  '/government/skill-intelligence': { crumb: 'Skill Intelligence', title: 'District Skill Intelligence' },
  '/government/analytics': { crumb: 'Analytics', title: 'District & Outcome Analytics' },
  '/government/settings': { crumb: 'Settings / Consent', title: 'Settings' },
  '/admin/seed': { crumb: 'Settings / Consent', title: 'Seed / Reset Demo Data' },
  // provider
  '/provider/dashboard': { crumb: 'Overview', title: 'Provider Dashboard' },
  '/provider/trainees': { crumb: 'Trainees', title: 'Trainees' },
  '/provider/followups': { crumb: 'Follow-ups', title: 'Follow-up Status' },
  '/provider/risk': { crumb: 'Risk & Interventions', title: 'Outcome Risk & Intervention Center' },
  '/provider/interventions': { crumb: 'Risk & Interventions', title: 'Intervention Log' },
  '/provider/skill-gaps': { crumb: 'Skill Intelligence', title: 'Course Skill Gaps' },
  '/provider/analytics': { crumb: 'Analytics', title: 'Outcome Analytics' },
  '/provider/settings': { crumb: 'Settings / Consent', title: 'Settings' },
  // counsellor
  '/counsellor/worklist': { crumb: 'Risk & Interventions', title: 'Outcome Risk & Intervention Center' },
  '/counsellor/trainees': { crumb: 'Trainees', title: 'Trainee Profiles' },
  '/counsellor/followups': { crumb: 'Follow-ups', title: 'Follow-up Queue' },
  '/counsellor/settings': { crumb: 'Settings / Consent', title: 'Settings' },
  // trainee
  '/trainee/home': { crumb: 'Overview', title: 'My Career' },
  '/trainee/timeline': { crumb: 'Career Timeline', title: 'My Career Timeline' },
  '/trainee/followups': { crumb: 'Follow-ups', title: 'My Follow-ups' },
  '/trainee/consent': { crumb: 'Consent', title: 'Consent Controls' },
  // employer
  '/employer/dashboard': { crumb: 'Overview', title: 'Employer Dashboard' },
  '/employer/verifications': { crumb: 'Verification Requests', title: 'Employer Dashboard' },
  '/employer/settings': { crumb: 'Settings', title: 'Settings' },
};

const META_PATTERNS = [
  [/^\/government\/district\/[^/]+$/, { crumb: 'Analytics', title: 'District Analytics' }],
  [/^\/government\/provider\/[^/]+$/, { crumb: 'Providers', title: 'Provider Dashboard' }],
  [/^\/provider\/trainee\/[^/]+$/, { crumb: 'Trainees', title: 'Trainee Record' }],
  [/^\/provider\/course\/[^/]+\/skill-gap$/, { crumb: 'Skill Intelligence', title: 'Course Skill-Gap Report' }],
  [/^\/counsellor\/trainee\/[^/]+$/, { crumb: 'Trainees', title: 'Trainee Record' }],
  [/^\/trainee\/followup\/[^/]+$/, { crumb: 'Follow-ups', title: 'Follow-up Check-in' }],
];

export function getPageMeta(pathname) {
  if (META_EXACT[pathname]) return META_EXACT[pathname];
  for (const [re, meta] of META_PATTERNS) {
    if (re.test(pathname)) return meta;
  }
  return { crumb: '', title: 'LifeTrack' };
}
