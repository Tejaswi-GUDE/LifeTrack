// Turns the framework-agnostic seed bundle (src/seed/data.js) into flat,
// per-collection arrays that mirror exactly what `seed.js` inserts into
// MongoDB - except _id/refs are readable slugs here instead of ObjectIds,
// so verification output can be read directly. Field names and shapes are
// identical to the Mongoose schemas, so every pipeline below is a real
// MongoDB aggregation pipeline that runs unmodified via `Model.aggregate()`
// once pointed at Atlas.
const { providers, courses, jobSkillReferences, trainees, users } = require('../seed/data');

function flatten() {
  const collections = {
    providers: [],
    courses: [],
    jobSkillReferences: jobSkillReferences.map((j) => ({ _id: j.occupationTitle, ...j })),
    trainees: [],
    outcomeEvents: [],
    employmentPeriods: [],
    incomeCheckpoints: [],
    verifications: [],
    skillMatchResults: [],
    followupSchedules: [],
    followupResponses: [],
    rootCauses: [],
    interventions: [],
    consentRecords: [],
    users: [],
  };

  providers.forEach((p) => collections.providers.push({ _id: p.slug, name: p.name, district: p.district }));
  courses.forEach((c) =>
    collections.courses.push({ _id: c.slug, name: c.name, providerId: c.providerSlug, skillTags: c.skillTags }));

  let seq = 0;
  const nextId = (prefix) => `${prefix}_${++seq}`;

  trainees.forEach((t) => {
    collections.trainees.push({
      _id: t.slug,
      name: t.name,
      contact: t.contact,
      district: t.district,
      demographicTags: t.demographicTags,
      courseId: t.courseSlug,
      providerId: t.providerSlug,
      batchId: t.batchId,
      training: t.training,
      currentStatus: t.currentStatus,
      currentConfidence: t.currentConfidence,
      outcomeRisk: t.outcomeRisk,
      attritionRisk: t.attritionRisk,
      consentSummary: t.consentSummary,
      createdAt: t.training.certificationDate,
    });

    (t.outcomeEvents || []).forEach((oe) =>
      collections.outcomeEvents.push({ _id: nextId('oe'), traineeId: t.slug, ...oe }));

    (t.employmentPeriods || []).forEach((ep) =>
      collections.employmentPeriods.push({ _id: ep.slug, traineeId: t.slug, ...ep }));

    (t.incomeCheckpoints || []).forEach((ic) =>
      collections.incomeCheckpoints.push({
        _id: nextId('ic'), traineeId: t.slug,
        employmentPeriodId: ic.employmentPeriodSlug || null,
        checkpointDay: ic.checkpointDay, amountInr: ic.amountInr, recordedDate: ic.recordedDate,
      }));

    (t.verifications || []).forEach((v) =>
      collections.verifications.push({
        _id: nextId('ver'), traineeId: t.slug,
        employmentPeriodId: v.employmentPeriodSlug || null,
        method: v.method, employerName: v.employerName, claim: v.claim,
        status: v.status, respondedAt: v.respondedAt,
      }));

    (t.skillMatchResults || []).forEach((sm) =>
      collections.skillMatchResults.push({
        _id: nextId('sm'), traineeId: t.slug,
        employmentPeriodId: sm.employmentPeriodSlug || null,
        score: sm.score, band: sm.band, missingSkills: sm.missingSkills,
        bridgeSuggestions: sm.bridgeSuggestions, computedAt: sm.computedAt,
      }));

    (t.followupSchedules || []).forEach((fs, i) =>
      collections.followupSchedules.push({
        _id: `${t.slug}_fs_${fs.checkpointDay}`, traineeId: t.slug,
        checkpointDay: fs.checkpointDay, scheduledDate: fs.scheduledDate,
        status: fs.status, escalatedAt: fs.escalatedAt || null,
      }));

    (t.followupResponses || []).forEach((fr) =>
      collections.followupResponses.push({
        _id: nextId('fr'), scheduleId: `${t.slug}_fs_${fr.checkpointDay}`, traineeId: t.slug,
        channel: fr.channel, answers: fr.answers, submittedDate: fr.submittedDate,
      }));

    (t.rootCauses || []).forEach((rc) =>
      collections.rootCauses.push({ _id: nextId('rc'), traineeId: t.slug, ...rc }));

    (t.interventions || []).forEach((iv) =>
      collections.interventions.push({ _id: nextId('iv'), traineeId: t.slug, ...iv }));

    (t.consentRecords || []).forEach((cr) =>
      collections.consentRecords.push({ _id: nextId('cr'), traineeId: t.slug, ...cr }));
  });

  users.forEach((u) =>
    collections.users.push({ _id: u.slug, name: u.name, role: u.role, scopeRef: u.scopeSlug || null }));

  return collections;
}

module.exports = { flatten };
