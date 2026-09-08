// Employer Dashboard — server-side aggregation for one employer.
// Employers are not a first-class entity; they are identified by name across
// EmploymentPeriod.employerName and Verification.employerName.

const {
  Trainee, Course,
  EmploymentPeriod, IncomeCheckpoint, Verification, SkillMatchResult, JobSkillReference,
} = require('../models');

const round1 = (n) => Math.round(n * 10) / 10;
const pct = (num, den) => (den > 0 ? round1((num / den) * 100) : null);
const daysAgo = (d, now) => (d ? Math.floor((now - new Date(d)) / 86400000) : null);

async function buildEmployerDashboard(employerName) {
  if (!employerName) {
    const e = new Error('An employer name is required');
    e.status = 400;
    throw e;
  }
  const now = new Date();

  const [periods, verifications, jobRefs] = await Promise.all([
    EmploymentPeriod.find({ employerName }).lean(),
    Verification.find({ employerName }).lean(),
    JobSkillReference.find().lean(),
  ]);

  const traineeIds = [...new Set([...periods, ...verifications].map((x) => String(x.traineeId)))];
  const [trainees, incomes, skillMatches, courses] = await Promise.all([
    Trainee.find({ _id: { $in: traineeIds } }).lean(),
    IncomeCheckpoint.find({ traineeId: { $in: traineeIds } }).lean(),
    SkillMatchResult.find({ traineeId: { $in: traineeIds } }).lean(),
    Course.find().lean(),
  ]);
  const traineeMap = new Map(trainees.map((t) => [String(t._id), t]));
  const courseMap = new Map(courses.map((c) => [String(c._id), c]));
  const jobRefMap = new Map(jobRefs.map((j) => [j.occupationTitle, j.requiredSkills || []]));

  const incomesBy = new Map();
  for (const c of incomes) {
    const k = String(c.traineeId);
    if (!incomesBy.has(k)) incomesBy.set(k, []);
    incomesBy.get(k).push(c);
  }
  const smBy = new Map();
  for (const s of skillMatches) {
    const k = String(s.traineeId);
    if (!smBy.has(k)) smBy.set(k, []);
    smBy.get(k).push(s);
  }
  const latestSm = (tid, periodId) => {
    let list = smBy.get(String(tid)) || [];
    if (periodId) {
      const forP = list.filter((s) => String(s.employmentPeriodId) === String(periodId));
      if (forP.length) list = forP;
    }
    return list.slice().sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0] || null;
  };
  const verForPeriod = (pid) =>
    verifications
      .filter((v) => String(v.employmentPeriodId) === String(pid))
      .sort((a, b) => new Date(b.respondedAt || 0) - new Date(a.respondedAt || 0))[0] || null;

  // ---- employees (one row per employment spell at this employer) ----
  const employees = periods
    .slice()
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .map((p) => {
      const t = traineeMap.get(String(p.traineeId));
      const v = verForPeriod(p._id);
      const sm = latestSm(p.traineeId, p._id);
      const cps = (incomesBy.get(String(p.traineeId)) || [])
        .slice()
        .sort((a, b) => new Date(a.recordedDate) - new Date(b.recordedDate));
      const wage =
        cps.length >= 1
          ? {
              latest: cps[cps.length - 1].amountInr,
              baseline: cps[0].amountInr,
              growthPct: cps.length >= 2 && cps[0].amountInr > 0 ? round1(((cps[cps.length - 1].amountInr - cps[0].amountInr) / cps[0].amountInr) * 100) : null,
            }
          : null;
      return {
        traineeId: String(p.traineeId),
        name: t ? t.name : '—',
        course: t ? (courseMap.get(String(t.courseId)) || {}).name || null : null,
        occupation: p.occupation,
        kind: p.kind,
        startDate: p.startDate,
        endDate: p.endDate,
        sinceDays: daysAgo(p.startDate, now),
        isActive: !p.endDate,
        exitReason: p.exitReason || null,
        verificationStatus: v ? v.status : 'none',
        skillMatch: sm ? { score: sm.score, band: sm.band, missing: sm.missingSkills || [] } : null,
        wage,
      };
    });

  const active = employees.filter((e) => e.isActive);
  const past = employees.filter((e) => !e.isActive);

  // ---- verification requests ----
  const verificationRequests = verifications
    .slice()
    .sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || new Date(b.createdAt) - new Date(a.createdAt))
    .map((v) => {
      const t = traineeMap.get(String(v.traineeId));
      return {
        id: String(v._id),
        traineeId: String(v.traineeId),
        traineeName: t ? t.name : '—',
        method: v.method,
        claimRole: v.claim && v.claim.role,
        claimJoinDate: v.claim && v.claim.joinDate,
        status: v.status,
        respondedAt: v.respondedAt,
        ageDays: daysAgo((v.claim && v.claim.joinDate) || v.createdAt, now),
      };
    });

  // ---- skill requirements for the occupations this employer hires ----
  const occupations = [...new Set(periods.map((p) => p.occupation).filter(Boolean))];
  const skillRequirements = occupations.map((occ) => {
    const required = jobRefMap.get(occ) || [];
    // which of this employer's employees in that occupation have each skill covered by training
    const rowsForOcc = employees.filter((e) => e.occupation === occ);
    const gapCounts = {};
    for (const e of rowsForOcc) {
      for (const g of (e.skillMatch && e.skillMatch.missing) || []) gapCounts[g] = (gapCounts[g] || 0) + 1;
    }
    const gapSkills = Object.entries(gapCounts).sort((a, b) => b[1] - a[1]).map(([skill, count]) => ({ skill, count }));
    const avgMatch = rowsForOcc.map((e) => (e.skillMatch ? e.skillMatch.score : null)).filter((s) => s != null);
    return {
      occupation: occ,
      requiredSkills: required,
      hires: rowsForOcc.length,
      avgSkillMatch: avgMatch.length ? round1(avgMatch.reduce((s, x) => s + x, 0) / avgMatch.length) : null,
      gapSkills,
    };
  });

  const totals = {
    employees: new Set(employees.map((e) => e.traineeId)).size,
    activeEmployees: active.length,
    pastEmployees: past.length,
    verifiedEmployees: employees.filter((e) => e.verificationStatus === 'confirmed').length,
    pendingVerifications: verificationRequests.filter((v) => v.status === 'pending').length,
    disputedVerifications: verificationRequests.filter((v) => v.status === 'disputed').length,
  };

  const retentionRate = pct(active.length, employees.length);

  return {
    employer: { name: employerName },
    generatedAt: now.toISOString(),
    totals,
    hiring: {
      placementsThroughLifetrack: employees.length,
      retainedNow: active.length,
      exited: past.length,
      retentionRate,
    },
    employees,
    verificationRequests,
    skillRequirements,
    pendingActions: totals.pendingVerifications + totals.disputedVerifications,
  };
}

module.exports = { buildEmployerDashboard };
