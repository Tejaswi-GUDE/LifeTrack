/**
 * Shared display formatters. Used by the pages built after the three flagship
 * screens (which kept their own local helpers, deliberately untouched).
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const inr = (n) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);
export const pct = (v) => (v == null ? '—' : `${v}%`);
export const pctInt = (v) => (v == null ? '—' : `${Math.round(v)}%`);
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const num = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'));

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export const bandColor = (b) => (b === 'high' ? 'var(--brick)' : b === 'medium' ? 'var(--ochre)' : 'var(--teal)');
export const bandTone = (b) => (b === 'high' ? 'brick' : b === 'medium' ? 'ochre' : 'teal');

/** semantic colour for an outcome status (Design System §2) */
export const statusColor = (s) => {
  if (['employed', 'self_employed', 'apprentice', 'apprenticeship_converted'].includes(s)) return 'var(--teal)';
  if (s === 'job_lost') return 'var(--brick)';
  if (['unemployed', 'not_responding'].includes(s)) return 'var(--ochre)';
  return 'var(--slate-30)';
};

/** colour for a non-placement root-cause label (matches the Government Dashboard) */
export const reasonColor = (label) =>
  ({
    skill_mismatch: 'var(--ochre)',
    insufficient_vacancies: 'var(--slate-30)',
    salary_mismatch: 'var(--brick)',
    interview_failure: 'var(--brick)',
    location_barrier: 'var(--slate-30)',
    further_education: 'var(--teal)',
    candidate_preference: 'var(--slate-30)',
    employer_rejection: 'var(--brick)',
    training_engagement_issue: 'var(--brick)',
    other: 'var(--slate-30)',
    unclassified: 'var(--slate-30)',
  })[label] || 'var(--slate-30)';
