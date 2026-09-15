// Skill intelligence for one trainee — what skills they hold, which in-demand
// skills they still lack, and a rule-based "grow while you work" path.
// Rule-based, no ML. Shared by the trainee profile and the follow-up questions.

// Cross-cutting skills employers ask for across almost every entry role — used
// so there is always a growth story even when a trainee covers their own role.
const DEMAND_BOOST = ['MS Excel', 'Spoken English', 'Digital Literacy'];

// How to acquire a given skill *without leaving the current job*, and what it unlocks.
const SKILL_GROWTH = {
  'MS Excel': {
    bridge: 'Advanced Excel module (≈2 weeks, evening/weekend)',
    mode: 'alongside your current job',
    unlocks: ['Senior Data Entry Operator', 'MIS Assistant', 'Junior Data Analyst'],
    note: 'Formulas, pivot tables and simple dashboards are the biggest single gap for office roles.',
  },
  'Spoken English': {
    bridge: 'Workplace Spoken-English course (6 weeks, evening)',
    mode: 'alongside your current job',
    unlocks: ['Customer-facing roles', 'Team lead', 'Front-office / reception'],
    note: 'Opens customer-facing and supervisory roles that pay more than back-office work.',
  },
  'Digital Literacy': {
    bridge: 'Basic Digital Literacy / CCC certification (4 weeks)',
    mode: 'alongside your current job',
    unlocks: ['Data Entry Operator', 'e-Governance Assistant', 'Retail POS roles'],
    note: 'Email, cloud files and basic troubleshooting are assumed in most formal jobs now.',
  },
  'Point of Sale Billing': {
    bridge: 'On-the-job POS training + a 1-week retail-systems module',
    mode: 'at your workplace',
    unlocks: ['Cashier', 'Retail Team Member', 'Store Supervisor'],
    note: 'Hands-on billing experience quickly moves you from floor staff to till/cash handling.',
  },
  'Retail Etiquette': {
    bridge: 'Customer-service etiquette workshop (weekend)',
    mode: 'alongside your current job',
    unlocks: ['Retail Team Member', 'Customer Care Associate'],
    note: 'Grooming, greeting and complaint handling are what get floor staff promoted.',
  },
  'Circuit Reading': {
    bridge: 'Blueprint / circuit-diagram reading module (3 weeks, evening)',
    mode: 'alongside your current job',
    unlocks: ['Site Electrician', 'Electrical Supervisor'],
    note: 'Reading wiring diagrams is the line between a helper and a full site electrician.',
  },
  'Safety Protocols': {
    bridge: 'Electrical safety & first-aid certification (1 week)',
    mode: 'at your workplace',
    unlocks: ['Site Electrician', 'Safety Marshal'],
    note: 'A safety certificate is often mandatory for contractor sites and raises daily wage.',
  },
  Finishing: {
    bridge: 'Garment finishing & quality-check module (2 weeks)',
    mode: 'at your workplace',
    unlocks: ['Machine Operator (Grade A)', 'Line Checker'],
    note: 'Finishing quality decides piece-rate and moves you up the line.',
  },
};

const GENERIC_GROWTH = (skill) => ({
  bridge: `Short "${skill}" module (online or evening)`,
  mode: 'alongside your current job',
  unlocks: ['A higher grade / pay band in your current field'],
  note: `${skill} is asked for by employers in roles above your current one.`,
});

const lc = (s) => String(s || '').toLowerCase();

function bestOccupationForCourse(courseSkills = [], jobRefs = []) {
  const taught = new Set(courseSkills.map(lc));
  let best = null;
  let bestScore = -1;
  for (const ref of jobRefs) {
    const overlap = (ref.requiredSkills || []).filter((s) => taught.has(lc(s))).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = ref;
    }
  }
  return bestScore > 0 ? best : null;
}

function rolesRequiring(skill, jobRefs) {
  return jobRefs
    .filter((j) => (j.requiredSkills || []).some((s) => lc(s) === lc(skill)))
    .map((j) => j.occupationTitle);
}

/**
 * @param {{ trainee, course, activePeriod, jobRefs, skillMatchLatest? }} args
 */
function buildSkillIntel({ trainee, course, activePeriod, jobRefs = [], skillMatchLatest = null }) {
  const taught = (course && course.skillTags) || [];
  const seeded = Array.isArray(trainee.skills) && trainee.skills.length ? trainee.skills : taught;
  const has = [...new Set(seeded.map((s) => String(s).trim()).filter(Boolean))];
  const hasLc = new Set(has.map(lc));

  const jobRefMap = new Map(jobRefs.map((j) => [j.occupationTitle, j.requiredSkills || []]));
  const targetOccupation =
    (activePeriod && activePeriod.occupation) ||
    (bestOccupationForCourse(taught, jobRefs) || {}).occupationTitle ||
    null;
  const required = (targetOccupation && jobRefMap.get(targetOccupation)) || [];

  const missingRole = required.filter((s) => !hasLc.has(lc(s)));
  const demand = [...new Set([...required, ...DEMAND_BOOST])];
  const missingDemand = demand.filter((s) => !hasLc.has(lc(s)));

  const coverage = required.length
    ? Math.round(((required.length - missingRole.length) / required.length) * 100)
    : null;

  const recommendations = missingDemand.slice(0, 5).map((skill) => {
    const g = SKILL_GROWTH[skill] || GENERIC_GROWTH(skill);
    const inDemandFor = [...new Set([...rolesRequiring(skill, jobRefs), ...(g.unlocks || [])])].slice(0, 4);
    return {
      skill,
      requiredForCurrentRole: required.some((s) => lc(s) === lc(skill)),
      inDemandFor,
      why: g.note,
      howToGrow: `${g.bridge} — ${g.mode}. No break in employment needed.`,
      unlocks: g.unlocks || [],
    };
  });

  let growthPath = [];
  if (recommendations.length) {
    const first = recommendations[0];
    growthPath = [
      {
        stage: 'Now',
        text: targetOccupation
          ? `Working as ${targetOccupation}${activePeriod ? ` at ${activePeriod.employerName}` : ''}.`
          : 'Certified and looking for a placement.',
      },
      { stage: 'Next 1–3 months', text: `${first.skill}: ${first.howToGrow}` },
      {
        stage: 'Then',
        text: `Qualifies for ${first.unlocks[0] || 'a higher pay band'}${
          recommendations[1] ? `; after that, add ${recommendations[1].skill}.` : '.'
        }`,
      },
    ];
  } else {
    growthPath = [
      { stage: 'Now', text: targetOccupation ? `Working as ${targetOccupation}.` : 'Certified.' },
      { stage: 'Next', text: 'Skills for the current role are covered — aim for a supervisory certification next.' },
    ];
  }

  return {
    has,
    taught,
    targetOccupation,
    required,
    missingRole,
    missingDemand,
    coverage,
    latestMatchScore: skillMatchLatest ? skillMatchLatest.score : null,
    latestMatchBand: skillMatchLatest ? skillMatchLatest.band : null,
    recommendations,
    growthPath,
  };
}

module.exports = { buildSkillIntel, bestOccupationForCourse, DEMAND_BOOST, SKILL_GROWTH };
