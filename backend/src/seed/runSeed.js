// Seeding logic, extracted so it can run either from the CLI (seed.js) or
// in-process (devServer.js / a future POST /api/admin/seed/reset).
// Assumes Mongoose is already connected. Wipes and reloads every collection.

const mongoose = require('mongoose');
const {
  User, Provider, Course, JobSkillReference, Trainee, OutcomeEvent,
  EmploymentPeriod, IncomeCheckpoint, Verification, SkillMatchResult,
  FollowupSchedule, FollowupResponse, RootCause, Intervention,
  ConsentRecord, AuditLog,
} = require('../models');
const { providers, courses, jobSkillReferences, trainees, users } = require('./data');

async function runSeed() {
  console.log('[seed] clearing existing collections...');
  await Promise.all([
    User.deleteMany({}), Provider.deleteMany({}), Course.deleteMany({}),
    JobSkillReference.deleteMany({}), Trainee.deleteMany({}), OutcomeEvent.deleteMany({}),
    EmploymentPeriod.deleteMany({}), IncomeCheckpoint.deleteMany({}), Verification.deleteMany({}),
    SkillMatchResult.deleteMany({}), FollowupSchedule.deleteMany({}), FollowupResponse.deleteMany({}),
    RootCause.deleteMany({}), Intervention.deleteMany({}), ConsentRecord.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // 1. Providers
  const providerBySlug = {};
  for (const p of providers) {
    const doc = await Provider.create({ name: p.name, district: p.district });
    providerBySlug[p.slug] = doc;
  }
  console.log(`[seed] providers: ${providers.length}`);

  // 2. Courses (need providerId)
  const courseBySlug = {};
  for (const c of courses) {
    const doc = await Course.create({
      name: c.name,
      providerId: providerBySlug[c.providerSlug]._id,
      skillTags: c.skillTags,
    });
    courseBySlug[c.slug] = doc;
  }
  console.log(`[seed] courses: ${courses.length}`);

  // 3. Job skill reference table (no FKs)
  await JobSkillReference.insertMany(jobSkillReferences);
  console.log(`[seed] job skill references: ${jobSkillReferences.length}`);

  // 4. Trainees + every child collection, per trainee bundle
  const traineeBySlug = {};
  const counts = {
    outcomeEvents: 0, employmentPeriods: 0, incomeCheckpoints: 0, verifications: 0,
    skillMatchResults: 0, followupSchedules: 0, followupResponses: 0, rootCauses: 0,
    interventions: 0, consentRecords: 0,
  };

  for (const t of trainees) {
    const trainee = await Trainee.create({
      name: t.name,
      contact: t.contact,
      district: t.district,
      demographicTags: t.demographicTags,
      courseId: courseBySlug[t.courseSlug]._id,
      providerId: providerBySlug[t.providerSlug]._id,
      batchId: t.batchId,
      training: t.training,
      currentStatus: t.currentStatus,
      currentConfidence: t.currentConfidence,
      outcomeRisk: t.outcomeRisk,
      attritionRisk: t.attritionRisk,
      consentSummary: t.consentSummary,
    });
    traineeBySlug[t.slug] = trainee;

    const periodBySlug = {};
    for (const ep of t.employmentPeriods || []) {
      const doc = await EmploymentPeriod.create({
        traineeId: trainee._id,
        kind: ep.kind,
        employerName: ep.employerName,
        occupation: ep.occupation,
        startDate: ep.startDate,
        endDate: ep.endDate,
        exitReason: ep.exitReason || null,
        isActive: ep.isActive,
      });
      periodBySlug[ep.slug] = doc;
      counts.employmentPeriods++;
    }

    for (const oe of t.outcomeEvents || []) {
      await OutcomeEvent.create({ traineeId: trainee._id, ...oe });
      counts.outcomeEvents++;
    }

    for (const ic of t.incomeCheckpoints || []) {
      await IncomeCheckpoint.create({
        traineeId: trainee._id,
        employmentPeriodId: ic.employmentPeriodSlug ? periodBySlug[ic.employmentPeriodSlug]._id : null,
        checkpointDay: ic.checkpointDay,
        amountInr: ic.amountInr,
        recordedDate: ic.recordedDate,
      });
      counts.incomeCheckpoints++;
    }

    for (const v of t.verifications || []) {
      await Verification.create({
        traineeId: trainee._id,
        employmentPeriodId: v.employmentPeriodSlug ? periodBySlug[v.employmentPeriodSlug]._id : null,
        method: v.method,
        employerName: v.employerName,
        claim: v.claim,
        status: v.status,
        respondedAt: v.respondedAt,
      });
      counts.verifications++;
    }

    for (const sm of t.skillMatchResults || []) {
      await SkillMatchResult.create({
        traineeId: trainee._id,
        employmentPeriodId: sm.employmentPeriodSlug ? periodBySlug[sm.employmentPeriodSlug]._id : null,
        score: sm.score,
        band: sm.band,
        missingSkills: sm.missingSkills,
        bridgeSuggestions: sm.bridgeSuggestions,
        computedAt: sm.computedAt,
      });
      counts.skillMatchResults++;
    }

    const scheduleByDay = {};
    for (const fs of t.followupSchedules || []) {
      const doc = await FollowupSchedule.create({
        traineeId: trainee._id,
        checkpointDay: fs.checkpointDay,
        scheduledDate: fs.scheduledDate,
        status: fs.status,
        escalatedAt: fs.escalatedAt || null,
      });
      scheduleByDay[fs.checkpointDay] = doc;
      counts.followupSchedules++;
    }

    for (const fr of t.followupResponses || []) {
      await FollowupResponse.create({
        scheduleId: scheduleByDay[fr.checkpointDay]?._id || null,
        traineeId: trainee._id,
        channel: fr.channel,
        answers: fr.answers,
        submittedDate: fr.submittedDate,
      });
      counts.followupResponses++;
    }

    for (const rc of t.rootCauses || []) {
      await RootCause.create({ traineeId: trainee._id, ...rc });
      counts.rootCauses++;
    }

    for (const iv of t.interventions || []) {
      await Intervention.create({ traineeId: trainee._id, ...iv });
      counts.interventions++;
    }

    for (const cr of t.consentRecords || []) {
      await ConsentRecord.create({ traineeId: trainee._id, ...cr });
      counts.consentRecords++;
    }
  }
  console.log(`[seed] trainees: ${trainees.length}`);
  console.log('[seed] child records:', counts);

  // 5. Users (resolve scopeSlug -> providerId/traineeId)
  for (const u of users) {
    let scopeRef = null;
    if (u.role === 'provider') scopeRef = providerBySlug[u.scopeSlug]._id;
    if (u.role === 'trainee') scopeRef = traineeBySlug[u.scopeSlug]._id;
    await User.create({ name: u.name, role: u.role, scopeRef });
  }
  console.log(`[seed] users: ${users.length}`);

  await AuditLog.create({
    entity: 'System', entityId: new mongoose.Types.ObjectId(),
    action: 'seed_reset', actorRole: 'system',
  });

  console.log('[seed] done.');
}

module.exports = { runSeed };
