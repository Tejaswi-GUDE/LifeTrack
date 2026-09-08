// Shared display labels for enum values (kept out of the schemas so the DB
// stays the source of truth and the wording lives in one place).

const ROOT_CAUSE_LABELS = {
  skill_mismatch: 'Skill mismatch',
  insufficient_vacancies: 'Insufficient vacancies',
  salary_mismatch: 'Salary mismatch',
  interview_failure: 'Interview failure',
  location_barrier: 'Location barrier',
  further_education: 'Further education',
  candidate_preference: 'Candidate preference',
  employer_rejection: 'Employer rejection',
  training_engagement_issue: 'Training engagement issue',
  other: 'Other / non-responsive',
};

const INTERVENTION_LABELS = {
  bridge_course_referral: 'Bridge course referral',
  employer_referral_drive: 'Employer referral drive',
  career_counselling: 'Career counselling',
  interview_prep_session: 'Interview prep session',
  relocation_or_remote_referral: 'Relocation / remote-work referral',
  general_counselling: 'General counselling',
  re_employment_support: 'Re-employment support',
};

const STATUS_LABELS = {
  certified_no_outcome: 'Certified — no outcome yet',
  employed: 'Employed',
  self_employed: 'Self-employed',
  apprentice: 'Apprentice',
  unemployed: 'Unemployed',
  job_lost: 'Job lost',
  not_responding: 'Not responding',
  other: 'Other',
};

const CONFIDENCE_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

const CONSENT_PURPOSE_LABELS = {
  data_collection: 'Data collection',
  employer_contact: 'Employer contact',
  analytics: 'Analytics use',
};

const label = (map, key, fallback) => map[key] || fallback || key;

module.exports = {
  ROOT_CAUSE_LABELS,
  INTERVENTION_LABELS,
  STATUS_LABELS,
  CONFIDENCE_LABELS,
  CONSENT_PURPOSE_LABELS,
  label,
};
