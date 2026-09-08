// District / Outcome Analytics — higher-level intelligence for government
// decision-making. Self-contained (own scoped query) so it never touches the
// working governmentDashboard.js. All figures are live from the seed.

const mongoose = require('mongoose');
const {
  Trainee, Provider, Course,
  EmploymentPeriod, IncomeCheckpoint, Verification, SkillMatchResult, RootCause, JobSkillReference,
} = require('../models');
const { DISTRICT_STATE } = require('./districts');
const { ROOT_CAUSE_LABELS, STATUS_LABELS, label } = require('./labels');

const round1 = (n) => Math.round(n * 10) / 10;
const pct = (num, den) => (den > 0 ? round1((num / den) * 100) : null);
const groupBy = (arr, fn) => {
  const m = new Map();
  for (const x of arr) {
    const k = String(fn(x));
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
};

async function buildOutcomeAnalytics({ district = null, courseId = null, providerId = null, gender = null, ageBand = null } = {}) {
  const [providers, courses, jobRefs] = await Promise.all([
    Provider.find().lean(),
    Course.find().lean(),
    JobSkillReference.find().lean(),
  ]);
  const providerMap = new Map(providers.map((p) => [String(p._id), p]));
  const courseMap = new Map(courses.map((c) => [String(c._id), c]));

  const q = {};
  if (district) q.district = district;
  if (providerId && mongoose.isValidObjectId(providerId)) q.providerId = providerId;
  if (courseId && mongoose.isValidObjectId(courseId)) q.courseId = courseId;
  if (gender) q['demographicTags.gender'] = gender;
  if (ageBand) q['demographicTags.ageBand'] = ageBand;

  const trainees = await Trainee.find(q).lean();
  const ids = trainees.map((t) => t._id);

  const [periods, incomes, verifications, skillMatches, rootCauses] = await Promise.all([
    EmploymentPeriod.find({ traineeId: { $in: ids } }).lean(),
    IncomeCheckpoint.find({ traineeId: { $in: ids } }).lean(),
    Verification.find({ traineeId: { $in: ids } }).lean(),
    SkillMatchResult.find({ traineeId: { $in: ids } }).lean(),
    RootCause.find({ traineeId: { $in: ids } }).lean(),
  ]);

  const periodsBy = groupBy(periods, (x) => x.traineeId);
  const incomesBy = groupBy(incomes, (x) => x.traineeId);
  const smBy = groupBy(skillMatches, (x) => x.traineeId);
  const rcBy = groupBy(rootCauses, (x) => x.traineeId);
  const latestSm = (tid) =>
    (smBy.get(String(tid)) || []).slice().sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0] || null;
  const isEmployed = (t) => t.currentStatus === 'employed';
  const everEmployed = (t) => (periodsBy.get(String(t._id)) || []).length > 0;
  const retained = (t) => (periodsBy.get(String(t._id)) || []).some((p) => !p.endDate);

  // ---- KPI block ----
  const certified = trainees.filter((t) => t.training && t.training.certified);
  const ee = trainees.filter(everEmployed);
  const wagePcts = [];
  for (const t of trainees) {
    const cps = (incomesBy.get(String(t._id)) || []).slice().sort((a, b) => new Date(a.recordedDate) - new Date(b.recordedDate));
    if (cps.length < 2 || !cps[0].amountInr) continue;
    wagePcts.push(((cps[cps.length - 1].amountInr - cps[0].amountInr) / cps[0].amountInr) * 100);
  }
  const smScores = trainees
    .filter((t) => ['employed', 'self_employed', 'apprentice'].includes(t.currentStatus))
    .map((t) => (latestSm(t._id) ? latestSm(t._id).score : null))
    .filter((s) => s != null);

  const kpis = {
    trained: trainees.length,
    certified: certified.length,
    placementRate: { value: pct(certified.filter(isEmployed).length, certified.length), numerator: certified.filter(isEmployed).length, denominator: certified.length },
    retentionRate: { value: pct(ee.filter(retained).length, ee.length), numerator: ee.filter(retained).length, denominator: ee.length },
    wageGrowth: { value: wagePcts.length ? round1(wagePcts.reduce((s, x) => s + x, 0) / wagePcts.length) : null, sampleSize: wagePcts.length },
    skillMatch: { value: smScores.length ? round1(smScores.reduce((s, x) => s + x, 0) / smScores.length) : null, sampleSize: smScores.length },
    selfEmployed: trainees.filter((t) => t.currentStatus === 'self_employed').length,
    apprentices: trainees.filter((t) => t.currentStatus === 'apprentice').length,
  };

  const confidenceDistribution = { high: 0, medium: 0, low: 0 };
  for (const t of trainees) if (confidenceDistribution[t.currentConfidence] != null) confidenceDistribution[t.currentConfidence] += 1;

  // ---- trends ----
  const byDay = new Map();
  for (const c of incomes) {
    if (c.checkpointDay == null) continue;
    if (!byDay.has(c.checkpointDay)) byDay.set(c.checkpointDay, []);
    byDay.get(c.checkpointDay).push(c.amountInr);
  }
  const wageByCheckpoint = [...byDay.entries()]
    .map(([day, a]) => ({ checkpointDay: day, avgIncome: Math.round(a.reduce((s, x) => s + x, 0) / a.length), sampleSize: a.length }))
    .sort((a, b) => a.checkpointDay - b.checkpointDay);

  const mixOrder = ['employed', 'self_employed', 'apprentice', 'unemployed', 'job_lost', 'not_responding', 'certified_no_outcome', 'other'];
  const mixCounts = {};
  for (const t of trainees) mixCounts[t.currentStatus] = (mixCounts[t.currentStatus] || 0) + 1;
  const outcomeMix = mixOrder
    .filter((s) => mixCounts[s])
    .map((s) => ({ status: s, label: label(STATUS_LABELS, s), count: mixCounts[s], pct: pct(mixCounts[s], trainees.length) }));

  // ---- provider comparison ----
  const providerComparison = [...groupBy(trainees, (t) => t.providerId).entries()]
    .map(([pid, list]) => {
      const p = providerMap.get(pid);
      const cert = list.filter((t) => t.training && t.training.certified);
      const sm = list.filter((t) => ['employed', 'self_employed', 'apprentice'].includes(t.currentStatus)).map((t) => (latestSm(t._id) ? latestSm(t._id).score : 0));
      return {
        id: pid,
        name: (p && p.name) || 'Provider',
        district: (p && p.district) || (list[0] && list[0].district),
        trainees: list.length,
        placementRate: pct(cert.filter(isEmployed).length, cert.length),
        skillMatch: sm.length ? round1(sm.reduce((s, x) => s + x, 0) / sm.length) : null,
      };
    })
    .sort((a, b) => (b.placementRate ?? -1) - (a.placementRate ?? -1));

  // ---- course comparison ----
  const courseComparison = [...groupBy(trainees, (t) => t.courseId).entries()]
    .map(([cid, list]) => {
      const c = courseMap.get(cid);
      const cert = list.filter((t) => t.training && t.training.certified);
      const sm = list.filter((t) => ['employed', 'self_employed', 'apprentice'].includes(t.currentStatus)).map((t) => (latestSm(t._id) ? latestSm(t._id).score : 0));
      return {
        id: cid,
        name: (c && c.name) || 'Course',
        provider: c ? (providerMap.get(String(c.providerId)) || {}).name : null,
        trainees: list.length,
        placementRate: pct(cert.filter(isEmployed).length, cert.length),
        skillMatch: sm.length ? round1(sm.reduce((s, x) => s + x, 0) / sm.length) : null,
      };
    })
    .sort((a, b) => (b.placementRate ?? -1) - (a.placementRate ?? -1));

  // ---- non-placement reasons ----
  const unplaced = trainees.filter((t) => ['unemployed', 'not_responding', 'job_lost'].includes(t.currentStatus));
  const reasonMap = new Map();
  for (const t of unplaced) {
    const rc = (rcBy.get(String(t._id)) || []).slice().sort((a, b) => new Date(b.determinedAt) - new Date(a.determinedAt))[0];
    const key = rc ? rc.label : 'unclassified';
    if (!reasonMap.has(key)) reasonMap.set(key, { label: key, displayLabel: rc ? label(ROOT_CAUSE_LABELS, rc.label) : 'Not yet classified', count: 0 });
    reasonMap.get(key).count += 1;
  }
  const nonPlacement = { total: unplaced.length, reasons: [...reasonMap.values()].sort((a, b) => b.count - a.count) };

  // ---- skill gap + skill demand vs supply (per district) ----
  const gapMap = new Map();
  for (const t of trainees) {
    const sm = latestSm(t._id);
    if (!sm || !sm.missingSkills || !sm.missingSkills.length) continue;
    for (const skill of sm.missingSkills) {
      if (!gapMap.has(skill)) gapMap.set(skill, { skill, trainees: new Set(), courses: new Set() });
      gapMap.get(skill).trainees.add(String(t._id));
      gapMap.get(skill).courses.add((courseMap.get(String(t.courseId)) || {}).name || '—');
    }
  }
  const skillGaps = [...gapMap.values()]
    .map((g) => ({ skill: g.skill, affectedTrainees: g.trainees.size, courses: [...g.courses] }))
    .sort((a, b) => b.affectedTrainees - a.affectedTrainees || a.skill.localeCompare(b.skill));

  // demand = skills required by occupations trainees actually work in
  const workedOccupations = [...new Set(periods.map((p) => p.occupation).filter(Boolean))];
  const jobRefMap = new Map(jobRefs.map((j) => [j.occupationTitle, j.requiredSkills || []]));
  const demandSkills = new Set();
  for (const occ of workedOccupations) for (const s of jobRefMap.get(occ) || []) demandSkills.add(s);
  // supply = skills taught by the courses trainees are enrolled in
  const enrolledCourseIds = [...new Set(trainees.map((t) => String(t.courseId)))];
  const supplySkills = new Set();
  for (const cid of enrolledCourseIds) for (const s of (courseMap.get(cid) || {}).skillTags || []) supplySkills.add(s);
  const allSkills = [...new Set([...demandSkills, ...supplySkills])].sort();
  const skillSupplyDemand = allSkills.map((skill) => ({
    skill,
    demand: demandSkills.has(skill),
    supply: supplySkills.has(skill),
    gapTrainees: (gapMap.get(skill) || { trainees: new Set() }).trainees.size,
  }));

  // district × skill gap heatmap (gap-intensity = # trainees in that district missing that skill)
  const districts = [...new Set(trainees.map((t) => t.district))].sort();
  const heatSkills = skillGaps.slice(0, 6).map((g) => g.skill);
  const heatmap = {
    rows: districts,
    cols: heatSkills,
    cells: districts.map((d) =>
      heatSkills.map((skill) => {
        const g = gapMap.get(skill);
        if (!g) return 0;
        return [...g.trainees].filter((tid) => {
          const tt = trainees.find((x) => String(x._id) === tid);
          return tt && tt.district === d;
        }).length;
      }),
    ),
  };

  // ---- demographics cross-tab ----
  const demoBlock = (field, labels) => {
    const groups = groupBy(trainees, (t) => (t.demographicTags && t.demographicTags[field]) || 'undisclosed');
    return [...groups.entries()]
      .map(([key, list]) => {
        const cert = list.filter((t) => t.training && t.training.certified);
        const sm = list.filter((t) => ['employed', 'self_employed', 'apprentice'].includes(t.currentStatus)).map((t) => (latestSm(t._id) ? latestSm(t._id).score : 0));
        return {
          key,
          label: (labels && labels[key]) || key,
          trainees: list.length,
          placementRate: pct(cert.filter(isEmployed).length, cert.length),
          skillMatch: sm.length ? round1(sm.reduce((s, x) => s + x, 0) / sm.length) : null,
        };
      })
      .sort((a, b) => b.trainees - a.trainees);
  };
  const demographics = {
    byGender: demoBlock('gender', { male: 'Male', female: 'Female', other: 'Other', undisclosed: 'Undisclosed' }),
    byAgeBand: demoBlock('ageBand', null),
  };

  return {
    generatedAt: new Date().toISOString(),
    scope: { district, courseId, providerId, gender, ageBand },
    filterOptions: {
      districts: [...new Set(providers.map((p) => p.district))].sort(),
      states: [...new Set(providers.map((p) => DISTRICT_STATE[p.district]).filter(Boolean))].sort(),
      courses: courses.map((c) => ({ id: String(c._id), name: c.name })),
      providers: providers.map((p) => ({ id: String(p._id), name: p.name })),
      genders: ['male', 'female', 'other'],
      ageBands: ['18-24', '25-34', '35-44', '45+'],
    },
    kpis,
    confidenceDistribution,
    trends: { wageByCheckpoint, outcomeMix },
    providerComparison,
    courseComparison,
    nonPlacement,
    skillGaps,
    skillSupplyDemand,
    heatmap,
    demographics,
  };
}

module.exports = { buildOutcomeAnalytics };
