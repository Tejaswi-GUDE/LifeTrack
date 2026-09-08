// Government Impact Dashboard — server-side aggregation.
//
// Every number here is computed live from the seeded collections (no
// hard-coded values), following the KPI formulas in PRD §18 and the
// aggregation patterns proven in src/verify/runQueries.js. Shaped exactly
// for docs/flagship-screens/01_government_dashboard.html.

const {
  Trainee,
  Provider,
  Course,
  EmploymentPeriod,
  IncomeCheckpoint,
  Verification,
  SkillMatchResult,
  RootCause,
} = require('../models');
const { DISTRICT_STATE, districtsInState } = require('./districts');
const { ROOT_CAUSE_LABELS } = require('./labels');

const round1 = (n) => Math.round(n * 10) / 10;
const pct = (num, den) => (den > 0 ? round1((num / den) * 100) : null);

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = String(keyFn(x));
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

async function buildGovernmentDashboard({ state = null, district = null, verifiedOnly = false } = {}) {
  // ---- 1. Resolve scope to a set of districts -----------------------------
  let districtFilter = null;
  if (district) districtFilter = [district];
  else if (state) districtFilter = districtsInState(state);

  const traineeQuery = districtFilter ? { district: { $in: districtFilter } } : {};

  const [trainees, providers, courses] = await Promise.all([
    Trainee.find(traineeQuery).lean(),
    Provider.find().lean(),
    Course.find().lean(),
  ]);

  const providerMap = new Map(providers.map((p) => [String(p._id), p]));
  const courseMap = new Map(courses.map((c) => [String(c._id), c]));
  const traineeIds = trainees.map((t) => t._id);

  const [periods, incomes, verifications, skillMatches, rootCauses] = await Promise.all([
    EmploymentPeriod.find({ traineeId: { $in: traineeIds } }).lean(),
    IncomeCheckpoint.find({ traineeId: { $in: traineeIds } }).lean(),
    Verification.find({ traineeId: { $in: traineeIds } }).lean(),
    SkillMatchResult.find({ traineeId: { $in: traineeIds } }).lean(),
    RootCause.find({ traineeId: { $in: traineeIds } }).lean(),
  ]);

  const periodsByTrainee = groupBy(periods, (x) => x.traineeId);
  const incomesByTrainee = groupBy(incomes, (x) => x.traineeId);
  const versByTrainee = groupBy(verifications, (x) => x.traineeId);
  const smByTrainee = groupBy(skillMatches, (x) => x.traineeId);
  const rcByTrainee = groupBy(rootCauses, (x) => x.traineeId);

  // ---- per-trainee helpers ---------------------------------------------
  const latestSkillMatch = (tid) => {
    const list = smByTrainee.get(String(tid)) || [];
    if (!list.length) return null;
    return list.slice().sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0];
  };
  const activePeriod = (tid) =>
    (periodsByTrainee.get(String(tid)) || []).find((p) => !p.endDate) || null;
  const hasConfirmedVerification = (tid) =>
    (versByTrainee.get(String(tid)) || []).some((v) => v.status === 'confirmed');
  // provenance of the trainee's *current* employment claim
  const activeVerificationStatus = (tid) => {
    const ap = activePeriod(tid);
    let list = versByTrainee.get(String(tid)) || [];
    if (ap) {
      const forActive = list.filter((v) => String(v.employmentPeriodId) === String(ap._id));
      if (forActive.length) list = forActive;
    }
    list = list
      .slice()
      .sort((a, b) => new Date(b.respondedAt || b.createdAt || 0) - new Date(a.respondedAt || a.createdAt || 0));
    return list[0] ? list[0].status : null;
  };

  const isEmployed = (t) => t.currentStatus === 'employed';
  const isSelfEmployed = (t) => t.currentStatus === 'self_employed';
  const isApprentice = (t) => t.currentStatus === 'apprentice';
  // "Verified only" toggle: only count an employment as a placement if the
  // current claim is employer-confirmed (PRD §14 confidence model).
  const countsAsPlaced = (t) => {
    if (!isEmployed(t)) return false;
    if (verifiedOnly) return activeVerificationStatus(t._id) === 'confirmed';
    return true;
  };

  // ---- 2. Totals ------------------------------------------------------
  const certified = trainees.filter((t) => t.training && t.training.certified);
  const totals = {
    trained: trainees.length,
    certified: certified.length,
    employed: trainees.filter(isEmployed).length,
    selfEmployed: trainees.filter(isSelfEmployed).length,
    apprentices: trainees.filter(isApprentice).length,
    unemployed: trainees.filter((t) => t.currentStatus === 'unemployed').length,
    notResponding: trainees.filter((t) => t.currentStatus === 'not_responding').length,
    providers: new Set(trainees.map((t) => String(t.providerId))).size,
    districts: new Set(trainees.map((t) => t.district)).size,
  };

  // ---- 3. KPI: Placement Rate (PRD §18) ------------------------------
  const placedNum = certified.filter(countsAsPlaced).length;
  const placementConfidence = { verified: 0, selfReported: 0, needsReview: 0 };
  for (const t of certified.filter(isEmployed)) {
    const st = activeVerificationStatus(t._id);
    if (st === 'confirmed') placementConfidence.verified += 1;
    else if (st === 'disputed' || st === 'no_record') placementConfidence.needsReview += 1;
    else placementConfidence.selfReported += 1;
  }
  const placementRate = {
    value: pct(placedNum, certified.length),
    numerator: placedNum,
    denominator: certified.length,
    confidence: placementConfidence,
  };

  // ---- 4. KPI: Retention Rate --------------------------------------
  const everEmployed = trainees.filter((t) => {
    const ps = periodsByTrainee.get(String(t._id)) || [];
    if (!ps.length) return false;
    return !verifiedOnly || hasConfirmedVerification(t._id);
  });
  const retainedNum = everEmployed.filter((t) =>
    (periodsByTrainee.get(String(t._id)) || []).some((p) => !p.endDate),
  ).length;
  const retentionRate = {
    value: pct(retainedNum, everEmployed.length),
    numerator: retainedNum,
    denominator: everEmployed.length,
  };

  // ---- 5. KPI: Avg Wage Growth % (verify/runQueries.js QUERY 3) ----
  const wagePcts = [];
  for (const t of trainees) {
    if (verifiedOnly && !hasConfirmedVerification(t._id)) continue;
    const cps = (incomesByTrainee.get(String(t._id)) || [])
      .slice()
      .sort((a, b) => new Date(a.recordedDate) - new Date(b.recordedDate));
    if (cps.length < 2) continue;
    const base = cps[0].amountInr;
    const latest = cps[cps.length - 1].amountInr;
    if (base > 0) wagePcts.push(((latest - base) / base) * 100);
  }
  const wageGrowth = {
    value: wagePcts.length ? round1(wagePcts.reduce((s, x) => s + x, 0) / wagePcts.length) : null,
    sampleSize: wagePcts.length,
  };

  // ---- 6. KPI: Avg Skill Match Score --------------------------------
  const smPopulation = trainees.filter(
    (t) => (isEmployed(t) || isSelfEmployed(t)) && (!verifiedOnly || hasConfirmedVerification(t._id)),
  );
  const smScores = smPopulation
    .map((t) => {
      const sm = latestSkillMatch(t._id);
      return sm ? sm.score : null;
    })
    .filter((s) => typeof s === 'number');
  const skillMatch = {
    value: smScores.length ? round1(smScores.reduce((s, x) => s + x, 0) / smScores.length) : null,
    sampleSize: smScores.length,
  };

  // ---- 7. Outcome confidence distribution (PRD §18) ---------------
  const confidenceDistribution = { high: 0, medium: 0, low: 0 };
  for (const t of trainees) {
    if (confidenceDistribution[t.currentConfidence] != null) {
      confidenceDistribution[t.currentConfidence] += 1;
    }
  }

  // ---- 8. Provider & District performance -------------------------
  const perfRow = (list, id, name, districtName) => {
    const cert = list.filter((t) => t.training && t.training.certified);
    const placed = cert.filter(countsAsPlaced).length;
    const smVals = list.map((t) => {
      const sm = latestSkillMatch(t._id);
      return sm ? sm.score : 0; // trainees with no computed match count as 0
    });
    const confidenceMix = { high: 0, medium: 0, low: 0 };
    for (const t of list) {
      if (confidenceMix[t.currentConfidence] != null) confidenceMix[t.currentConfidence] += 1;
    }
    return {
      id,
      name,
      district: districtName,
      trainees: list.length,
      placementRate: pct(placed, cert.length),
      skillMatch: smVals.length ? round1(smVals.reduce((s, x) => s + x, 0) / smVals.length) : null,
      confidenceMix,
    };
  };

  const byProvider = [...groupBy(trainees, (t) => t.providerId).entries()]
    .map(([pid, list]) => {
      const p = providerMap.get(pid);
      return perfRow(list, pid, (p && p.name) || 'Unknown provider', (p && p.district) || list[0].district);
    })
    .sort(
      (a, b) =>
        (a.placementRate ?? -1) - (b.placementRate ?? -1) || b.trainees - a.trainees || a.name.localeCompare(b.name),
    );

  const byDistrict = [...groupBy(trainees, (t) => t.district).entries()]
    .map(([d, list]) => {
      const row = perfRow(list, d, d, d);
      row.providers = new Set(list.map((t) => String(t.providerId))).size;
      return row;
    })
    .sort((a, b) => (a.placementRate ?? -1) - (b.placementRate ?? -1) || a.name.localeCompare(b.name));

  // ---- 9. Skill Gap Intelligence (verify/runQueries.js QUERY 11) --
  const gapMap = new Map();
  for (const t of trainees) {
    const sm = latestSkillMatch(t._id);
    if (!sm || !Array.isArray(sm.missingSkills) || !sm.missingSkills.length) continue;
    const courseName = (courseMap.get(String(t.courseId)) || {}).name || '—';
    for (const skill of sm.missingSkills) {
      if (!gapMap.has(skill)) gapMap.set(skill, { skill, courses: new Set(), trainees: new Set() });
      gapMap.get(skill).courses.add(courseName);
      gapMap.get(skill).trainees.add(String(t._id));
    }
  }
  const skillGaps = [...gapMap.values()]
    .map((g) => ({ skill: g.skill, courses: [...g.courses], affectedTrainees: g.trainees.size }))
    .sort((a, b) => b.affectedTrainees - a.affectedTrainees || a.skill.localeCompare(b.skill));

  // ---- 10. Non-placement reasons --------------------------------
  const unplaced = trainees.filter((t) =>
    ['unemployed', 'not_responding', 'job_lost'].includes(t.currentStatus),
  );
  const reasonMap = new Map();
  for (const t of unplaced) {
    const rc = (rcByTrainee.get(String(t._id)) || [])
      .slice()
      .sort((a, b) => new Date(b.determinedAt) - new Date(a.determinedAt))[0];
    const key = rc ? rc.label : 'unclassified';
    if (!reasonMap.has(key)) {
      reasonMap.set(key, {
        label: key,
        displayLabel: rc ? ROOT_CAUSE_LABELS[rc.label] || rc.label : 'Not yet classified',
        count: 0,
        source: rc ? rc.source : null,
      });
    }
    reasonMap.get(key).count += 1;
  }
  const isVague = (label) => label === 'other' || label === 'unclassified';
  const nonPlacement = {
    total: unplaced.length,
    reasons: [...reasonMap.values()].sort(
      (a, b) =>
        b.count - a.count ||
        Number(isVague(a.label)) - Number(isVague(b.label)) ||
        a.displayLabel.localeCompare(b.displayLabel),
    ),
  };

  // ---- 11. Alerts (computed from real signals) -----------------
  const alerts = [];

  // A — the district (or, when a single district is in scope, the provider)
  // that is dragging the scope's placement rate down, with the reason.
  const overallPlacement = placementRate.value;
  const rankable = (district ? byProvider : byDistrict).filter(
    (d) => d.trainees >= 1 && d.placementRate != null,
  );
  if (rankable.length >= 2 && overallPlacement != null) {
    // pick the entity with real non-placement (unplaced trainees + a known
    // root cause) whose placement rate is below the scope's overall rate
    for (const entity of rankable) {
      if (entity.placementRate >= overallPlacement) break; // rankable is ascending
      const laggUnplaced = unplaced.filter((t) =>
        district ? String(t.providerId) === entity.id : t.district === entity.id,
      );
      if (!laggUnplaced.length) continue;
      const rcCounts = new Map();
      for (const t of laggUnplaced) {
        const rc = (rcByTrainee.get(String(t._id)) || [])[0];
        if (rc) rcCounts.set(rc.label, (rcCounts.get(rc.label) || 0) + 1);
      }
      const topReason = [...rcCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!topReason) continue;
      const affectedCourse = laggUnplaced
        .map((t) => (courseMap.get(String(t.courseId)) || {}).name)
        .find(Boolean);
      const affectedProvider = laggUnplaced
        .map((t) => (providerMap.get(String(t.providerId)) || {}).name)
        .find(Boolean);
      alerts.push({
        id: 'placement-lagging-entity',
        tone: 'risk',
        title: `${entity.name} has the lowest placement rate (${Math.round(entity.placementRate)}%)`,
        body:
          `Driven mainly by ${(ROOT_CAUSE_LABELS[topReason[0]] || topReason[0]).toLowerCase()}` +
          `${affectedCourse ? ` in ${affectedCourse}` : ''}${affectedProvider ? ` (${affectedProvider})` : ''}.`,
      });
      break;
    }
  }

  const now = Date.now();
  const pending = verifications.filter((v) => v.status === 'pending');
  if (pending.length) {
    const withAge = pending.map((v) => {
      const ref = (v.claim && v.claim.joinDate) || v.createdAt;
      return {
        employerName: v.employerName,
        days: ref ? Math.floor((now - new Date(ref)) / 86400000) : null,
      };
    });
    const maxDays = Math.max(0, ...withAge.map((a) => a.days || 0));
    alerts.push({
      id: 'pending-verifications',
      tone: 'warning',
      title:
        `${pending.length} employer verification${pending.length > 1 ? 's' : ''} awaiting confirmation` +
        `${maxDays ? ` (up to ${maxDays} days)` : ''}`,
      body: `${[...new Set(withAge.map((a) => a.employerName))].join(', ')} — awaiting confirmation.`,
    });
  }

  const disputed = verifications.filter((v) => v.status === 'disputed');
  if (disputed.length) {
    alerts.push({
      id: 'disputed-verifications',
      tone: 'warning',
      title: `${disputed.length} employer verification${disputed.length > 1 ? 's' : ''} disputed — needs review`,
      body: `${[...new Set(disputed.map((v) => v.employerName))].join(', ')} disputed the reported employment.`,
    });
  }

  // ---- 12. Filter options (always the full set, not scope-limited) --
  const allDistricts = [...new Set(providers.map((p) => p.district))].sort();
  const scopeOptions = {
    states: [...new Set(allDistricts.map((d) => DISTRICT_STATE[d]).filter(Boolean))].sort(),
    districts: allDistricts,
  };

  return {
    scope: { state, district, verifiedOnly: !!verifiedOnly },
    scopeOptions,
    generatedAt: new Date().toISOString(),
    totals,
    kpis: { placementRate, retentionRate, wageGrowth, skillMatch },
    confidenceDistribution,
    performance: { byProvider, byDistrict },
    skillGaps,
    nonPlacement,
    alerts,
  };
}

module.exports = { buildGovernmentDashboard };
