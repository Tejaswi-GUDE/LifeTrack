// Risk & Intervention Center — per-trainee risk bundle for the detail pane.
//
// Uses the rule-based, explainable risk/intervention logic already in the
// data model (Trainee.outcomeRisk factor lists, RootCause, Intervention) plus
// the fixed root-cause → intervention lookup from the Build Spec §9.5. No ML.
// Shaped for docs/flagship-screens/03_risk_intervention_center.html.

const mongoose = require('mongoose');
const {
  Trainee, Course, Provider, User,
  EmploymentPeriod, Verification, SkillMatchResult, FollowupSchedule, FollowupResponse,
  RootCause, Intervention, JobSkillReference,
} = require('../models');
const { ROOT_CAUSE_LABELS, INTERVENTION_LABELS, STATUS_LABELS, CONFIDENCE_LABELS, label } = require('./labels');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d) => {
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
const round1 = (n) => Math.round(n * 10) / 10;

// Build Spec §9.5 — fixed lookup, human-approved before it becomes an action.
const ROOT_CAUSE_TO_INTERVENTION = {
  skill_mismatch: 'bridge_course_referral',
  insufficient_vacancies: 'employer_referral_drive',
  salary_mismatch: 'career_counselling',
  interview_failure: 'interview_prep_session',
  location_barrier: 'relocation_or_remote_referral',
  training_engagement_issue: 'general_counselling',
  further_education: 'general_counselling',
  candidate_preference: 'general_counselling',
  employer_rejection: 'interview_prep_session',
  other: 'general_counselling',
};

function daysAgoLabel(d, now) {
  const days = Math.floor((now - new Date(d)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

// pick the JobSkillReference occupation whose required skills best overlap the
// course's taught skills — the trainee's implied target role when they have no job yet.
function courseTargetOccupation(courseSkills, jobRefs) {
  const taught = new Set((courseSkills || []).map((s) => s.toLowerCase()));
  let best = null;
  let bestScore = -1;
  for (const ref of jobRefs) {
    const overlap = (ref.requiredSkills || []).filter((s) => taught.has(s.toLowerCase())).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = ref;
    }
  }
  return bestScore > 0 ? best : null;
}

async function buildTraineeRisk(id) {
  if (!mongoose.isValidObjectId(id)) {
    const e = new Error('Trainee not found');
    e.status = 404;
    throw e;
  }
  const trainee = await Trainee.findById(id).lean();
  if (!trainee) {
    const e = new Error('Trainee not found');
    e.status = 404;
    throw e;
  }

  const [course, provider, jobRefs] = await Promise.all([
    Course.findById(trainee.courseId).lean(),
    Provider.findById(trainee.providerId).lean(),
    JobSkillReference.find().lean(),
  ]);

  const [periods, verifications, skillMatches, schedules, responses, rootCauses, interventions, cohort] =
    await Promise.all([
      EmploymentPeriod.find({ traineeId: id }).lean(),
      Verification.find({ traineeId: id }).lean(),
      SkillMatchResult.find({ traineeId: id }).lean(),
      FollowupSchedule.find({ traineeId: id }).lean(),
      FollowupResponse.find({ traineeId: id }).lean(),
      RootCause.find({ traineeId: id }).lean(),
      Intervention.find({ traineeId: id }).lean(),
      Trainee.find({ courseId: trainee.courseId }).lean(),
    ]);

  const now = new Date();
  const cert = trainee.training && trainee.training.certificationDate
    ? new Date(trainee.training.certificationDate)
    : null;
  const daysSinceCert = cert ? Math.floor((now - cert) / 86400000) : null;

  const jobRefMap = new Map(jobRefs.map((j) => [j.occupationTitle, j.requiredSkills || []]));
  const activePeriod = periods.find((p) => !p.endDate) || null;
  const latestSm = skillMatches.slice().sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0] || null;

  // ---- root cause (latest) ----
  const rc = rootCauses.slice().sort((a, b) => new Date(b.determinedAt) - new Date(a.determinedAt))[0] || null;
  const rootCause = rc
    ? {
        label: rc.label,
        displayLabel: label(ROOT_CAUSE_LABELS, rc.label),
        source: rc.source,
        determinedAt: rc.determinedAt,
      }
    : null;

  // ---- skill mismatch panel ----
  const courseSkills = (course && course.skillTags) || [];
  let skillMismatch = null;
  let targetOccupation = null;
  let requiredSkills = [];
  let mismatchSource = null;

  if (activePeriod && latestSm) {
    targetOccupation = activePeriod.occupation;
    requiredSkills = jobRefMap.get(targetOccupation) || [];
    mismatchSource = 'employment';
  } else {
    const ref = courseTargetOccupation(courseSkills, jobRefs);
    if (ref) {
      targetOccupation = ref.occupationTitle;
      requiredSkills = ref.requiredSkills || [];
      mismatchSource = 'course-target';
    }
  }

  if (targetOccupation) {
    const taughtLc = new Set(courseSkills.map((s) => s.toLowerCase()));
    const matched = requiredSkills.filter((s) => taughtLc.has(s.toLowerCase()));
    const missing = requiredSkills.filter((s) => !taughtLc.has(s.toLowerCase()));

    // cohort's most frequently-missing skill (course-level skill-gap rollup)
    const cohortIds = cohort.map((c) => c._id);
    const cohortSm = cohortIds.length
      ? await SkillMatchResult.find({ traineeId: { $in: cohortIds } }).lean()
      : [];
    const missCount = new Map();
    for (const s of cohortSm) {
      for (const skill of s.missingSkills || []) missCount.set(skill, (missCount.get(skill) || 0) + 1);
    }
    const cohortTopMissingSkill =
      [...missCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || (missing[0] || null);

    skillMismatch = {
      courseName: course ? course.name : null,
      courseSkills,
      targetOccupation,
      requiredSkills,
      matched,
      missing,
      source: mismatchSource,
      latestScore: latestSm ? latestSm.score : null,
      latestBand: latestSm ? latestSm.band : null,
      cohortTopMissingSkill,
    };
  }

  // ---- follow-up status ----
  const dueCount = schedules.filter((s) => new Date(s.scheduledDate) <= now).length;
  const completedCount = schedules.filter((s) => s.status === 'completed').length;
  const overdue = schedules.some(
    (s) => (s.status === 'pending' && new Date(s.scheduledDate) <= now) || s.status === 'non_responsive',
  );
  const lastResp = responses.slice().sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))[0] || null;
  const upcoming = schedules
    .filter((s) => s.status === 'pending' && new Date(s.scheduledDate) > now)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0] || null;
  const followup = {
    responseRate: dueCount ? round1((completedCount / dueCount) * 100) : null,
    completed: completedCount,
    attempted: dueCount,
    overdue,
    lastResponseDate: lastResp ? lastResp.submittedDate : null,
    nextScheduled: upcoming ? { checkpointDay: upcoming.checkpointDay, scheduledDate: upcoming.scheduledDate } : null,
  };

  // ---- recommended intervention + review status ----
  const assigneeUsers = await User.find({ role: { $in: ['counsellor', 'provider'] } }).lean();
  const userMap = new Map(assigneeUsers.map((u) => [String(u._id), u]));

  // prefer the most recent non-dismissed intervention row
  const liveIv =
    interventions
      .filter((i) => i.status !== 'dismissed')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0] ||
    interventions.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0] ||
    null;

  const cohortMissingCount = skillMismatch && skillMismatch.cohortTopMissingSkill
    ? (await SkillMatchResult.find({ traineeId: { $in: cohort.map((c) => c._id) } }).lean()).filter((s) =>
        (s.missingSkills || []).includes(skillMismatch.cohortTopMissingSkill),
      ).length
    : 0;

  const basisParts = [];
  if (latestSm) basisParts.push(`skill match ${latestSm.score}%`);
  else basisParts.push('skill match unavailable (no job yet)');
  if (course) basisParts.push(`course skill-gap rollup for ${course.name}`);
  if (cohortMissingCount) basisParts.push(`${cohortMissingCount} similar case${cohortMissingCount > 1 ? 's' : ''} this cohort`);

  let recommendedIntervention = null;
  if (liveIv) {
    recommendedIntervention = {
      id: String(liveIv._id),
      type: liveIv.type,
      displayType: label(INTERVENTION_LABELS, liveIv.type),
      rationale: liveIv.rationale || '',
      basis: `Based on: ${basisParts.join(', ')}.`,
      status: liveIv.status,
      recommendedBy: liveIv.recommendedBy,
      assignedTo: liveIv.assignedTo ? (userMap.get(String(liveIv.assignedTo)) || {}).name || null : null,
      completedAt: liveIv.completedAt || null,
      outcomeNotes: liveIv.outcomeNotes || null,
      updatedAt: liveIv.updatedAt || null,
    };
  } else if (rc) {
    // derive from the fixed lookup (no row persisted yet)
    const type = ROOT_CAUSE_TO_INTERVENTION[rc.label] || 'general_counselling';
    recommendedIntervention = {
      id: null,
      type,
      displayType: label(INTERVENTION_LABELS, type),
      rationale: `Root cause is ${label(ROOT_CAUSE_LABELS, rc.label).toLowerCase()} (${rc.source.replace(/_/g, ' ')}).`,
      basis: `Based on: ${basisParts.join(', ')}.`,
      status: 'recommended',
      recommendedBy: 'system',
      assignedTo: null,
      completedAt: null,
      outcomeNotes: null,
      updatedAt: null,
    };
  }

  let reviewStatus = { state: 'none', label: 'No intervention recommended', by: null, at: null };
  if (recommendedIntervention) {
    const s = recommendedIntervention.status;
    if (s === 'recommended') {
      reviewStatus = { state: 'awaiting', label: 'Awaiting counsellor review', by: null, at: null };
    } else if (s === 'in_progress') {
      reviewStatus = {
        state: 'in_progress',
        label: `Approved${recommendedIntervention.assignedTo ? ' by ' + recommendedIntervention.assignedTo : ''}${
          recommendedIntervention.updatedAt ? ', ' + fmt(recommendedIntervention.updatedAt) : ''
        }`,
        by: recommendedIntervention.assignedTo,
        at: recommendedIntervention.updatedAt,
      };
    } else if (s === 'completed') {
      reviewStatus = {
        state: 'completed',
        label: `Completed${recommendedIntervention.assignedTo ? ' · ' + recommendedIntervention.assignedTo : ''}`,
        by: recommendedIntervention.assignedTo,
        at: recommendedIntervention.completedAt,
      };
    } else if (s === 'dismissed') {
      reviewStatus = { state: 'dismissed', label: 'Recommendation dismissed', by: null, at: null };
    }
  }

  // ---- priority ----
  const band = (trainee.outcomeRisk && trainee.outcomeRisk.band) || 'low';
  let priority = 'low';
  if (band === 'high' || (band === 'medium' && overdue)) priority = 'high';
  else if (band === 'medium') priority = 'medium';

  return {
    generatedAt: now.toISOString(),
    trainee: {
      id: String(trainee._id),
      name: trainee.name,
      displayId: `TRN-${cert ? cert.getFullYear() : new Date(trainee.createdAt).getFullYear()}-${String(trainee._id).slice(-4).toUpperCase()}`,
      course: course ? { id: String(course._id), name: course.name } : null,
      provider: provider ? { id: String(provider._id), name: provider.name } : null,
      district: trainee.district,
      currentStatus: trainee.currentStatus,
      currentStatusLabel: label(STATUS_LABELS, trainee.currentStatus),
      currentConfidence: trainee.currentConfidence,
      currentConfidenceLabel: label(CONFIDENCE_LABELS, trainee.currentConfidence),
      daysSinceCertification: daysSinceCert,
    },
    outcomeRisk: {
      score: (trainee.outcomeRisk && trainee.outcomeRisk.score) || 0,
      band,
      factors: (trainee.outcomeRisk && trainee.outcomeRisk.factors) || [],
      computedAt: (trainee.outcomeRisk && trainee.outcomeRisk.computedAt) || null,
      computedLabel: (trainee.outcomeRisk && trainee.outcomeRisk.computedAt)
        ? `Computed ${daysAgoLabel(trainee.outcomeRisk.computedAt, now)}`
        : null,
    },
    attritionRisk: {
      score: (trainee.attritionRisk && trainee.attritionRisk.score) || 0,
      band: (trainee.attritionRisk && trainee.attritionRisk.band) || 'low',
      factors: (trainee.attritionRisk && trainee.attritionRisk.factors) || [],
      computedAt: (trainee.attritionRisk && trainee.attritionRisk.computedAt) || null,
    },
    rootCause,
    skillMismatch,
    followup,
    recommendedIntervention,
    reviewStatus,
    priority,
    assigneeOptions: assigneeUsers.map((u) => ({ id: String(u._id), name: u.name, role: u.role })),
  };
}

module.exports = { buildTraineeRisk };
