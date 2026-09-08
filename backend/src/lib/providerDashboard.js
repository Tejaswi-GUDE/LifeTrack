// Provider Dashboard — server-side aggregation for one training provider.
// Same rule-based, live-from-seed approach as governmentDashboard.js.

const mongoose = require('mongoose');
const {
  Trainee, Provider, Course,
  EmploymentPeriod, IncomeCheckpoint, Verification, SkillMatchResult,
  FollowupSchedule, RootCause, Intervention,
} = require('../models');
const { ROOT_CAUSE_LABELS, INTERVENTION_LABELS, STATUS_LABELS, label } = require('./labels');

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

async function buildProviderDashboard(providerId, { courseId } = {}) {
  if (!mongoose.isValidObjectId(providerId)) {
    const e = new Error('Provider not found');
    e.status = 404;
    throw e;
  }
  const provider = await Provider.findById(providerId).lean();
  if (!provider) {
    const e = new Error('Provider not found');
    e.status = 404;
    throw e;
  }

  const tq = { providerId };
  if (courseId && mongoose.isValidObjectId(courseId)) tq.courseId = courseId;

  const [allTrainees, courses] = await Promise.all([
    Trainee.find({ providerId }).lean(),
    Course.find({ providerId }).lean(),
  ]);
  const trainees = courseId && mongoose.isValidObjectId(courseId)
    ? allTrainees.filter((t) => String(t.courseId) === String(courseId))
    : allTrainees;
  const courseMap = new Map(courses.map((c) => [String(c._id), c]));
  const ids = trainees.map((t) => t._id);

  const [periods, incomes, verifications, skillMatches, schedules, rootCauses, interventions] = await Promise.all([
    EmploymentPeriod.find({ traineeId: { $in: ids } }).lean(),
    IncomeCheckpoint.find({ traineeId: { $in: ids } }).lean(),
    Verification.find({ traineeId: { $in: ids } }).lean(),
    SkillMatchResult.find({ traineeId: { $in: ids } }).lean(),
    FollowupSchedule.find({ traineeId: { $in: ids } }).lean(),
    RootCause.find({ traineeId: { $in: ids } }).lean(),
    Intervention.find({ traineeId: { $in: ids } }).lean(),
  ]);

  const periodsBy = groupBy(periods, (x) => x.traineeId);
  const incomesBy = groupBy(incomes, (x) => x.traineeId);
  const smBy = groupBy(skillMatches, (x) => x.traineeId);
  const rcBy = groupBy(rootCauses, (x) => x.traineeId);
  const traineeMap = new Map(trainees.map((t) => [String(t._id), t]));

  const latestSm = (tid) =>
    (smBy.get(String(tid)) || []).slice().sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0] || null;
  const everEmployed = (t) => (periodsBy.get(String(t._id)) || []).length > 0;
  const retained = (t) => (periodsBy.get(String(t._id)) || []).some((p) => !p.endDate);
  const isEmployed = (t) => t.currentStatus === 'employed';

  const now = new Date();

  // ---- totals ----
  const certified = trainees.filter((t) => t.training && t.training.certified);
  const totals = {
    trainees: trainees.length,
    certified: certified.length,
    employed: trainees.filter(isEmployed).length,
    selfEmployed: trainees.filter((t) => t.currentStatus === 'self_employed').length,
    apprentices: trainees.filter((t) => t.currentStatus === 'apprentice').length,
    unemployed: trainees.filter((t) => t.currentStatus === 'unemployed').length,
    notResponding: trainees.filter((t) => t.currentStatus === 'not_responding').length,
  };

  // ---- KPIs ----
  const smScores = trainees
    .filter((t) => ['employed', 'self_employed', 'apprentice'].includes(t.currentStatus))
    .map((t) => (latestSm(t._id) ? latestSm(t._id).score : null))
    .filter((s) => typeof s === 'number');
  const everEmployedList = trainees.filter(everEmployed);
  const dueSchedules = schedules.filter((s) => new Date(s.scheduledDate) <= now);
  const completedSchedules = dueSchedules.filter((s) => s.status === 'completed');

  const kpis = {
    completionRate: { value: pct(certified.length, trainees.length), numerator: certified.length, denominator: trainees.length },
    placementRate: {
      value: pct(certified.filter(isEmployed).length, certified.length),
      numerator: certified.filter(isEmployed).length,
      denominator: certified.length,
    },
    retentionRate: {
      value: pct(everEmployedList.filter(retained).length, everEmployedList.length),
      numerator: everEmployedList.filter(retained).length,
      denominator: everEmployedList.length,
    },
    skillMatch: {
      value: smScores.length ? round1(smScores.reduce((s, x) => s + x, 0) / smScores.length) : null,
      sampleSize: smScores.length,
    },
    followupResponseRate: {
      value: pct(completedSchedules.length, dueSchedules.length),
      numerator: completedSchedules.length,
      denominator: dueSchedules.length,
    },
  };

  // ---- outcome mix ----
  const mixOrder = ['employed', 'self_employed', 'apprentice', 'unemployed', 'job_lost', 'not_responding', 'certified_no_outcome', 'other'];
  const mixCounts = {};
  for (const t of trainees) mixCounts[t.currentStatus] = (mixCounts[t.currentStatus] || 0) + 1;
  const outcomeMix = mixOrder
    .filter((s) => mixCounts[s])
    .map((s) => ({ status: s, label: label(STATUS_LABELS, s), count: mixCounts[s] }));

  // ---- wage trend by checkpoint (real) ----
  const byDay = new Map();
  for (const c of incomes) {
    if (!c.checkpointDay) continue;
    if (!byDay.has(c.checkpointDay)) byDay.set(c.checkpointDay, []);
    byDay.get(c.checkpointDay).push(c.amountInr);
  }
  const wageTrend = [...byDay.entries()]
    .map(([day, amounts]) => ({
      checkpointDay: day,
      avgIncome: Math.round(amounts.reduce((s, x) => s + x, 0) / amounts.length),
      sampleSize: amounts.length,
    }))
    .sort((a, b) => a.checkpointDay - b.checkpointDay);

  // ---- cohort / course performance ----
  const cohorts = [...groupBy(trainees, (t) => t.courseId).entries()].map(([cid, list]) => {
    const c = courseMap.get(cid);
    const cert = list.filter((t) => t.training && t.training.certified);
    const ee = list.filter(everEmployed);
    const sm = list
      .filter((t) => ['employed', 'self_employed', 'apprentice'].includes(t.currentStatus))
      .map((t) => (latestSm(t._id) ? latestSm(t._id).score : 0));
    return {
      id: cid,
      name: (c && c.name) || 'Course',
      batches: [...new Set(list.map((t) => t.batchId).filter(Boolean))],
      trainees: list.length,
      certified: cert.length,
      completionRate: pct(cert.length, list.length),
      placementRate: pct(cert.filter(isEmployed).length, cert.length),
      retentionRate: pct(ee.filter(retained).length, ee.length),
      skillMatch: sm.length ? round1(sm.reduce((s, x) => s + x, 0) / sm.length) : null,
    };
  }).sort((a, b) => (a.placementRate ?? -1) - (b.placementRate ?? -1) || a.name.localeCompare(b.name));

  // ---- non-placement reasons ----
  const unplaced = trainees.filter((t) => ['unemployed', 'not_responding', 'job_lost'].includes(t.currentStatus));
  const reasonMap = new Map();
  for (const t of unplaced) {
    const rc = (rcBy.get(String(t._id)) || []).slice().sort((a, b) => new Date(b.determinedAt) - new Date(a.determinedAt))[0];
    const key = rc ? rc.label : 'unclassified';
    if (!reasonMap.has(key)) {
      reasonMap.set(key, {
        label: key,
        displayLabel: rc ? label(ROOT_CAUSE_LABELS, rc.label) : 'Not yet classified',
        count: 0,
        source: rc ? rc.source : null,
      });
    }
    reasonMap.get(key).count += 1;
  }
  const nonPlacement = {
    total: unplaced.length,
    reasons: [...reasonMap.values()].sort((a, b) => b.count - a.count || a.displayLabel.localeCompare(b.displayLabel)),
  };

  // ---- skill gaps (per course) ----
  const gapMap = new Map();
  for (const t of trainees) {
    const sm = latestSm(t._id);
    if (!sm || !sm.missingSkills || !sm.missingSkills.length) continue;
    const cname = (courseMap.get(String(t.courseId)) || {}).name || '—';
    for (const skill of sm.missingSkills) {
      if (!gapMap.has(skill)) gapMap.set(skill, { skill, courses: new Set(), trainees: new Set(), bridge: new Set() });
      gapMap.get(skill).courses.add(cname);
      gapMap.get(skill).trainees.add(String(t._id));
      for (const b of sm.bridgeSuggestions || []) gapMap.get(skill).bridge.add(b);
    }
  }
  const skillGaps = [...gapMap.values()]
    .map((g) => ({ skill: g.skill, courses: [...g.courses], affectedTrainees: g.trainees.size, bridge: [...g.bridge] }))
    .sort((a, b) => b.affectedTrainees - a.affectedTrainees || a.skill.localeCompare(b.skill));

  // ---- trainees requiring attention ----
  const atRisk = trainees
    .filter((t) => ((t.outcomeRisk && t.outcomeRisk.band) || 'low') !== 'low' || t.currentStatus === 'not_responding')
    .map((t) => {
      const rc = (rcBy.get(String(t._id)) || [])[0];
      const certDate = t.training && t.training.certificationDate ? new Date(t.training.certificationDate) : null;
      return {
        id: String(t._id),
        name: t.name,
        course: (courseMap.get(String(t.courseId)) || {}).name || null,
        currentStatus: t.currentStatus,
        currentStatusLabel: label(STATUS_LABELS, t.currentStatus),
        riskScore: (t.outcomeRisk && t.outcomeRisk.score) || 0,
        riskBand: (t.outcomeRisk && t.outcomeRisk.band) || 'low',
        rootCause: rc ? label(ROOT_CAUSE_LABELS, rc.label) : null,
        daysSinceCertification: certDate ? Math.floor((now - certDate) / 86400000) : null,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  // ---- recent interventions ----
  const recentInterventions = interventions
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 8)
    .map((iv) => {
      const t = traineeMap.get(String(iv.traineeId));
      return {
        id: String(iv._id),
        traineeId: String(iv.traineeId),
        traineeName: t ? t.name : '—',
        type: iv.type,
        displayType: label(INTERVENTION_LABELS, iv.type),
        status: iv.status,
        rationale: iv.rationale || '',
        updatedAt: iv.updatedAt || iv.createdAt || null,
      };
    });

  return {
    provider: { id: String(provider._id), name: provider.name, district: provider.district },
    generatedAt: now.toISOString(),
    scope: { courseId: courseId || null },
    filterOptions: { courses: courses.map((c) => ({ id: String(c._id), name: c.name })) },
    totals,
    kpis,
    outcomeMix,
    wageTrend,
    cohorts,
    nonPlacement,
    skillGaps,
    atRisk,
    recentInterventions,
  };
}

module.exports = { buildProviderDashboard };
