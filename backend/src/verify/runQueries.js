// Executes the same MongoDB aggregation pipelines the /api/kpis, /api/dashboards
// and /api/trainees/:id routes will run in production - via `mingo`, a
// spec-compliant pure-JS MongoDB query engine - because this sandbox has no
// outbound access to MongoDB's binary distribution servers (see README).
// Every pipeline below is copy-paste valid for `Model.aggregate(pipeline)`
// once run against the real Atlas-backed collections from seed.js.
const { aggregate } = require('mingo');
const { flatten } = require('./flatten');
const { TODAY } = require('../seed/data');

const db = flatten();
const line = () => console.log('-'.repeat(78));
const heading = (t) => { line(); console.log(t); line(); };
// mingo needs to be told how to resolve a named collection for $lookup;
// a real MongoDB deployment resolves this natively from the database.
const lookupOpts = { collectionResolver: (name) => db[name] || [] };

// ── 1. Placement Rate = employed / total certified trainees ───────────────
heading('QUERY 1 — Placement Rate  (Section 18: employed / eligible × 100)');
const placementPipeline = [
  { $match: { 'training.certified': true } },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      employed: { $sum: { $cond: [{ $eq: ['$currentStatus', 'employed'] }, 1, 0] } },
    },
  },
  { $project: { _id: 0, total: 1, employed: 1, placementRatePct: { $multiply: [{ $divide: ['$employed', '$total'] }, 100] } } },
];
console.log(JSON.stringify(aggregate(db.trainees, placementPipeline), null, 2));

// ── 2. Self-Employment Rate & Apprenticeship Conversion Rate ──────────────
heading('QUERY 2 — Self-Employment Rate & Apprenticeship Conversion Rate');
const selfEmpPipeline = [
  { $match: { 'training.certified': true } },
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      selfEmployed: { $sum: { $cond: [{ $eq: ['$currentStatus', 'self_employed'] }, 1, 0] } },
    },
  },
  { $project: { _id: 0, total: 1, selfEmployed: 1, selfEmploymentRatePct: { $multiply: [{ $divide: ['$selfEmployed', '$total'] }, 100] } } },
];
console.log('Self-Employment Rate:', JSON.stringify(aggregate(db.trainees, selfEmpPipeline)[0]));

const apprenticeshipPipeline = [
  { $match: { type: { $in: ['apprenticeship_converted', 'apprenticeship_exited'] } } },
  {
    $group: {
      _id: null,
      completed: { $sum: 1 },
      converted: { $sum: { $cond: [{ $eq: ['$type', 'apprenticeship_converted'] }, 1, 0] } },
    },
  },
  { $project: { _id: 0, completed: 1, converted: 1, conversionRatePct: { $multiply: [{ $divide: ['$converted', '$completed'] }, 100] } } },
];
console.log('Apprenticeship Conversion Rate:', JSON.stringify(aggregate(db.outcomeEvents, apprenticeshipPipeline)[0]));

// ── 3. Wage Growth % per trainee (baseline checkpoint -> latest checkpoint) ─
heading('QUERY 3 — Wage Growth % per trainee (first checkpoint -> latest checkpoint)');
const wageGrowthPipeline = [
  { $sort: { traineeId: 1, recordedDate: 1 } },
  {
    $group: {
      _id: '$traineeId',
      checkpoints: { $push: { day: '$checkpointDay', amount: '$amountInr', date: '$recordedDate' } },
      baseline: { $first: '$amountInr' },
      latest: { $last: '$amountInr' },
      count: { $sum: 1 },
    },
  },
  { $match: { count: { $gte: 2 } } },
  { $project: { _id: 1, baseline: 1, latest: 1, wageGrowthPct: { $multiply: [{ $divide: [{ $subtract: ['$latest', '$baseline'] }, '$baseline'] }, 100] } } },
  { $sort: { wageGrowthPct: -1 } },
];
console.log(JSON.stringify(aggregate(db.incomeCheckpoints, wageGrowthPipeline), null, 2));

// ── 4. Skill Match Score — average across all trainees with a computed score ─
heading('QUERY 4 — Average Skill Match Score + per-trainee scores');
const skillMatchPipeline = [
  { $sort: { computedAt: -1 } },
  { $group: { _id: '$traineeId', latestScore: { $first: '$score' }, latestBand: { $first: '$band' }, missingSkills: { $first: '$missingSkills' } } },
  { $sort: { latestScore: 1 } },
];
const skillMatchResults = aggregate(db.skillMatchResults, skillMatchPipeline);
console.log(JSON.stringify(skillMatchResults, null, 2));
const avgSkillMatch = skillMatchResults.reduce((s, r) => s + r.latestScore, 0) / skillMatchResults.length;
console.log(`Average Skill Match Score across ${skillMatchResults.length} employed/self-employed trainees: ${avgSkillMatch.toFixed(1)}%`);

// ── 5. Follow-up Response Rate = completed / attempted (due) follow-ups ───
heading('QUERY 5 — Follow-up Response Rate (Section 18)');
const followupPipeline = [
  { $match: { scheduledDate: { $lte: TODAY } } },
  {
    $group: {
      _id: null,
      attempted: { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      nonResponsive: { $sum: { $cond: [{ $eq: ['$status', 'non_responsive'] }, 1, 0] } },
    },
  },
  { $project: { _id: 0, attempted: 1, completed: 1, nonResponsive: 1, responseRatePct: { $multiply: [{ $divide: ['$completed', '$attempted'] }, 100] } } },
];
console.log(JSON.stringify(aggregate(db.followupSchedules, followupPipeline)[0], null, 2));

// ── 6. Verification Rate = confirmed / total verification records ─────────
heading('QUERY 6 — Verification Rate (Section 18)');
const verificationPipeline = [
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
      disputed: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
      pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
    },
  },
  { $project: { _id: 0, total: 1, confirmed: 1, disputed: 1, pending: 1, verificationRatePct: { $multiply: [{ $divide: ['$confirmed', '$total'] }, 100] } } },
];
console.log(JSON.stringify(aggregate(db.verifications, verificationPipeline)[0], null, 2));

// ── 7. Outcome Confidence Distribution (Section 14/18) ─────────────────────
heading('QUERY 7 — Outcome Confidence Distribution');
const confidencePipeline = [
  { $group: { _id: '$currentConfidence', count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
];
const confDist = aggregate(db.trainees, confidencePipeline);
const confTotal = confDist.reduce((s, r) => s + r.count, 0);
console.log(confDist.map((r) => `${r._id}: ${r.count} (${((r.count / confTotal) * 100).toFixed(1)}%)`).join('\n'));

// ── 8. Non-placement Root-Cause Distribution ───────────────────────────────
heading('QUERY 8 — Non-Placement Root-Cause Distribution');
const rootCausePipeline = [
  { $group: { _id: '$label', count: { $sum: 1 }, sources: { $push: '$source' } } },
  { $sort: { count: -1 } },
];
console.log(JSON.stringify(aggregate(db.rootCauses, rootCausePipeline), null, 2));

// ── 9. Counsellor Worklist: at-risk trainees sorted by outcomeRisk.score ───
heading('QUERY 9 — Counsellor Worklist (at-risk trainees, sorted by risk score desc)');
const atRiskPipeline = [
  { $project: { _id: 1, name: 1, currentStatus: 1, currentConfidence: 1, riskScore: '$outcomeRisk.score', riskBand: '$outcomeRisk.band' } },
  { $sort: { riskScore: -1 } },
];
console.log(JSON.stringify(aggregate(db.trainees, atRiskPipeline), null, 2));

// ── 10. Full trainee profile join (mirrors GET /api/trainees/:id) ─────────
heading('QUERY 10 — Full Trainee Profile Join (example: "ravi")');
const profilePipeline = [
  { $match: { _id: 'ravi' } },
  { $lookup: { from: 'outcomeEvents', localField: '_id', foreignField: 'traineeId', as: 'outcomeEvents' } },
  { $lookup: { from: 'employmentPeriods', localField: '_id', foreignField: 'traineeId', as: 'employmentPeriods' } },
  { $lookup: { from: 'followupSchedules', localField: '_id', foreignField: 'traineeId', as: 'followupSchedules' } },
  { $lookup: { from: 'rootCauses', localField: '_id', foreignField: 'traineeId', as: 'rootCauses' } },
  { $lookup: { from: 'interventions', localField: '_id', foreignField: 'traineeId', as: 'interventions' } },
];
console.log(JSON.stringify(aggregate(db.trainees, profilePipeline, lookupOpts)[0], null, 2));

// ── 11. Course-level Skill-Gap Rollup (mirrors GET /api/courses/:id/skill-gap) ─
heading('QUERY 11 — Course Skill-Gap Rollup (course_office)');
const skillGapPipeline = [
  { $match: { courseId: 'course_office' } },
  { $lookup: { from: 'skillMatchResults', localField: '_id', foreignField: 'traineeId', as: 'matches' } },
  { $unwind: { path: '$matches', preserveNullAndEmptyArrays: false } },
  { $unwind: '$matches.missingSkills' },
  { $group: { _id: '$matches.missingSkills', trainees: { $push: '$_id' }, count: { $sum: 1 } } },
  { $sort: { count: -1 } },
];
console.log(JSON.stringify(aggregate(db.trainees, skillGapPipeline, lookupOpts), null, 2));

heading('ALL QUERIES EXECUTED SUCCESSFULLY');
