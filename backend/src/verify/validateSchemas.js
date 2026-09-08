// Verifies that every seeded document satisfies its real Mongoose schema
// (required fields, enums, types) WITHOUT needing a live database connection,
// using Mongoose's built-in `.validateSync()`. This sandbox has no outbound
// access to MongoDB's binary distribution servers (mongodb-memory-server's
// download is blocked), so this is how the schema layer is proven correct
// here; the exact same model files run unmodified against Atlas.
const mongoose = require('mongoose');
const {
  User, Provider, Course, JobSkillReference, Trainee, OutcomeEvent,
  EmploymentPeriod, IncomeCheckpoint, Verification, SkillMatchResult,
  FollowupSchedule, FollowupResponse, RootCause, Intervention,
  ConsentRecord, AuditLog,
} = require('../models');
const { providers, courses, jobSkillReferences, trainees, users } = require('../seed/data');

const oid = () => new mongoose.Types.ObjectId();
let failures = 0;
let checked = 0;

const pending = [];
function check(label, Model, data) {
  checked++;
  const doc = new Model(data);
  pending.push(
    doc.validate().then(
      () => console.log(`  OK    ${label}`),
      (err) => { failures++; console.error(`  FAIL  ${label}: ${err.message}`); }
    )
  );
}

console.log('=== Schema validation (Mongoose .validateSync(), no DB needed) ===\n');

console.log('Providers:');
providers.forEach((p) => check(p.slug, Provider, { name: p.name, district: p.district }));

console.log('\nCourses:');
courses.forEach((c) => check(c.slug, Course, { name: c.name, providerId: oid(), skillTags: c.skillTags }));

console.log('\nJobSkillReference:');
jobSkillReferences.forEach((j) => check(j.occupationTitle, JobSkillReference, j));

console.log('\nTrainees + all child records:');
trainees.forEach((t) => {
  const traineeId = oid();
  check(`Trainee: ${t.slug}`, Trainee, {
    name: t.name, contact: t.contact, district: t.district, demographicTags: t.demographicTags,
    courseId: oid(), providerId: oid(), batchId: t.batchId, training: t.training,
    currentStatus: t.currentStatus, currentConfidence: t.currentConfidence,
    outcomeRisk: t.outcomeRisk, attritionRisk: t.attritionRisk, consentSummary: t.consentSummary,
  });

  (t.outcomeEvents || []).forEach((oe, i) =>
    check(`  OutcomeEvent[${i}] (${t.slug})`, OutcomeEvent, { traineeId, ...oe }));

  (t.employmentPeriods || []).forEach((ep, i) =>
    check(`  EmploymentPeriod[${i}] (${t.slug})`, EmploymentPeriod, {
      traineeId, kind: ep.kind, employerName: ep.employerName, occupation: ep.occupation,
      startDate: ep.startDate, endDate: ep.endDate, exitReason: ep.exitReason || null, isActive: ep.isActive,
    }));

  (t.incomeCheckpoints || []).forEach((ic, i) =>
    check(`  IncomeCheckpoint[${i}] (${t.slug})`, IncomeCheckpoint, {
      traineeId, employmentPeriodId: ic.employmentPeriodSlug ? oid() : null,
      checkpointDay: ic.checkpointDay, amountInr: ic.amountInr, recordedDate: ic.recordedDate,
    }));

  (t.verifications || []).forEach((v, i) =>
    check(`  Verification[${i}] (${t.slug})`, Verification, {
      traineeId, employmentPeriodId: v.employmentPeriodSlug ? oid() : null,
      method: v.method, employerName: v.employerName, claim: v.claim, status: v.status, respondedAt: v.respondedAt,
    }));

  (t.skillMatchResults || []).forEach((sm, i) =>
    check(`  SkillMatchResult[${i}] (${t.slug})`, SkillMatchResult, {
      traineeId, employmentPeriodId: sm.employmentPeriodSlug ? oid() : null,
      score: sm.score, band: sm.band, missingSkills: sm.missingSkills,
      bridgeSuggestions: sm.bridgeSuggestions, computedAt: sm.computedAt,
    }));

  (t.followupSchedules || []).forEach((fs, i) =>
    check(`  FollowupSchedule[${i}] (${t.slug})`, FollowupSchedule, {
      traineeId, checkpointDay: fs.checkpointDay, scheduledDate: fs.scheduledDate,
      status: fs.status, escalatedAt: fs.escalatedAt || null,
    }));

  (t.followupResponses || []).forEach((fr, i) =>
    check(`  FollowupResponse[${i}] (${t.slug})`, FollowupResponse, {
      scheduleId: oid(), traineeId, channel: fr.channel, answers: fr.answers, submittedDate: fr.submittedDate,
    }));

  (t.rootCauses || []).forEach((rc, i) =>
    check(`  RootCause[${i}] (${t.slug})`, RootCause, { traineeId, ...rc }));

  (t.interventions || []).forEach((iv, i) =>
    check(`  Intervention[${i}] (${t.slug})`, Intervention, { traineeId, ...iv }));

  (t.consentRecords || []).forEach((cr, i) =>
    check(`  ConsentRecord[${i}] (${t.slug})`, ConsentRecord, { traineeId, ...cr }));
});

console.log('\nUsers:');
users.forEach((u) => check(u.slug, User, { name: u.name, role: u.role, scopeRef: u.scopeSlug ? oid() : null }));

console.log('\nAuditLog (sample):');
check('seed_reset', AuditLog, { entity: 'System', entityId: oid(), action: 'seed_reset', actorRole: 'system' });

Promise.all(pending).then(() => {
  console.log(`\n=== ${checked - failures}/${checked} documents passed schema validation ===`);
  if (failures > 0) process.exit(1);
});
