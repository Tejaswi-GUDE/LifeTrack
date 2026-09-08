// Trainee Profile + Career Timeline — server-side assembly.
//
// Merges the trainee's current-state fields with every append-only child
// collection into one profile document plus a single chronologically-sorted
// timeline. Every field traces to a seeded record — nothing is invented.
// Shaped for docs/flagship-screens/02_trainee_profile.html.

const mongoose = require('mongoose');
const {
  Trainee, Course, Provider, User,
  EmploymentPeriod, IncomeCheckpoint, Verification, SkillMatchResult,
  FollowupSchedule, FollowupResponse, RootCause, Intervention, ConsentRecord, OutcomeEvent,
  JobSkillReference,
} = require('../models');
const {
  ROOT_CAUSE_LABELS, INTERVENTION_LABELS, STATUS_LABELS, CONFIDENCE_LABELS,
  CONSENT_PURPOSE_LABELS, label,
} = require('./labels');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d) => {
  const x = new Date(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
};
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const round1 = (n) => Math.round(n * 10) / 10;

async function buildTraineeProfile(id) {
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

  const [course, provider] = await Promise.all([
    Course.findById(trainee.courseId).lean(),
    Provider.findById(trainee.providerId).lean(),
  ]);

  const [
    periods, incomes, verifications, skillMatches, schedules, responses,
    rootCauses, interventions, consentRecords, outcomeEvents, jobRefs,
  ] = await Promise.all([
    EmploymentPeriod.find({ traineeId: id }).lean(),
    IncomeCheckpoint.find({ traineeId: id }).lean(),
    Verification.find({ traineeId: id }).lean(),
    SkillMatchResult.find({ traineeId: id }).lean(),
    FollowupSchedule.find({ traineeId: id }).lean(),
    FollowupResponse.find({ traineeId: id }).lean(),
    RootCause.find({ traineeId: id }).lean(),
    Intervention.find({ traineeId: id }).lean(),
    ConsentRecord.find({ traineeId: id }).lean(),
    OutcomeEvent.find({ traineeId: id }).lean(),
    JobSkillReference.find().lean(),
  ]);

  const assigneeIds = interventions.map((i) => i.assignedTo).filter(Boolean);
  const users = assigneeIds.length ? await User.find({ _id: { $in: assigneeIds } }).lean() : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const now = new Date();
  const cert = trainee.training && trainee.training.certificationDate
    ? new Date(trainee.training.certificationDate)
    : null;
  const daysAgo = (d) => (d ? Math.floor((now - new Date(d)) / 86400000) : null);
  const daysBetween = (a, b) => (a && b ? Math.round((new Date(b) - new Date(a)) / 86400000) : null);

  const jobRefMap = new Map(jobRefs.map((j) => [j.occupationTitle, j.requiredSkills || []]));
  const periodById = new Map(periods.map((p) => [String(p._id), p]));

  // ---- verification / skill-match lookups per period ----
  const versByPeriod = new Map();
  for (const v of verifications) {
    const k = String(v.employmentPeriodId || 'none');
    if (!versByPeriod.has(k)) versByPeriod.set(k, []);
    versByPeriod.get(k).push(v);
  }
  const latestVerForPeriod = (pid) =>
    (versByPeriod.get(String(pid)) || [])
      .slice()
      .sort((a, b) => new Date(b.respondedAt || 0) - new Date(a.respondedAt || 0))[0] || null;

  const smByPeriod = new Map();
  for (const s of skillMatches) {
    const k = String(s.employmentPeriodId || 'none');
    if (!smByPeriod.has(k)) smByPeriod.set(k, []);
    smByPeriod.get(k).push(s);
  }
  const latestSmForPeriod = (pid) =>
    (smByPeriod.get(String(pid)) || [])
      .slice()
      .sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0] || null;
  const latestSm = skillMatches
    .slice()
    .sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0] || null;

  const empPeriods = periods.slice().sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const activePeriod = empPeriods.find((p) => !p.endDate) || null;

  // ================= current-state blocks =================
  let currentEmployment = null;
  if (activePeriod) {
    const v = latestVerForPeriod(activePeriod._id);
    currentEmployment = {
      employerName: activePeriod.employerName,
      occupation: activePeriod.occupation,
      kind: activePeriod.kind,
      startDate: activePeriod.startDate,
      sinceDays: daysAgo(activePeriod.startDate),
      tenureDays: daysAgo(activePeriod.startDate),
      verificationStatus: v ? v.status : 'none',
      verificationMethod: v ? v.method : null,
    };
  }

  const sortedIncomes = incomes.slice().sort((a, b) => new Date(a.recordedDate) - new Date(b.recordedDate));
  let wageProgression = null;
  if (sortedIncomes.length) {
    const baseline = sortedIncomes[0].amountInr;
    const latest = sortedIncomes[sortedIncomes.length - 1].amountInr;
    wageProgression = {
      baseline,
      latest,
      growthPct: baseline > 0 ? round1(((latest - baseline) / baseline) * 100) : null,
      checkpointsCount: sortedIncomes.length,
      series: sortedIncomes.map((c) => ({
        checkpointDay: c.checkpointDay,
        amountInr: c.amountInr,
        recordedDate: c.recordedDate,
      })),
    };
  }

  let skillMatchOut = null;
  if (latestSm) {
    const p = latestSm.employmentPeriodId ? periodById.get(String(latestSm.employmentPeriodId)) : null;
    const occ = p ? p.occupation : null;
    skillMatchOut = {
      score: latestSm.score,
      band: latestSm.band,
      missingSkills: latestSm.missingSkills || [],
      bridgeSuggestions: latestSm.bridgeSuggestions || [],
      occupation: occ,
      requiredSkills: occ ? jobRefMap.get(occ) || [] : [],
      computedAt: latestSm.computedAt,
    };
  }

  const completedCount = schedules.filter((s) => s.status === 'completed').length;
  const dueCount = schedules.filter((s) => new Date(s.scheduledDate) <= now).length;
  const upcoming = schedules
    .filter((s) => s.status === 'pending' && new Date(s.scheduledDate) > now)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0] || null;
  const lastResp = responses
    .slice()
    .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))[0] || null;
  const followups = {
    responseRate: dueCount ? round1((completedCount / dueCount) * 100) : null,
    completed: completedCount,
    attempted: dueCount,
    nextScheduled: upcoming
      ? { checkpointDay: upcoming.checkpointDay, scheduledDate: upcoming.scheduledDate }
      : null,
    lastResponseDate: lastResp ? lastResp.submittedDate : null,
    schedules: schedules
      .slice()
      .sort((a, b) => a.checkpointDay - b.checkpointDay)
      .map((s) => ({
        checkpointDay: s.checkpointDay,
        scheduledDate: s.scheduledDate,
        status: s.status,
        escalatedAt: s.escalatedAt || null,
      })),
  };

  const interventionsOut = interventions.map((iv) => ({
    id: String(iv._id),
    type: iv.type,
    displayType: label(INTERVENTION_LABELS, iv.type),
    rationale: iv.rationale,
    recommendedBy: iv.recommendedBy,
    assignedTo: iv.assignedTo ? (userMap.get(String(iv.assignedTo)) || {}).name || null : null,
    status: iv.status,
    outcomeNotes: iv.outcomeNotes || null,
    completedAt: iv.completedAt || null,
  }));

  const rootCausesOut = rootCauses
    .map((rc) => ({
      label: rc.label,
      displayLabel: label(ROOT_CAUSE_LABELS, rc.label),
      source: rc.source,
      determinedAt: rc.determinedAt,
    }))
    .sort((a, b) => new Date(b.determinedAt) - new Date(a.determinedAt));

  const consent = [
    ['data_collection', 'dataCollection'],
    ['employer_contact', 'employerContact'],
    ['analytics', 'analytics'],
  ].map(([purpose, key]) => {
    const recs = consentRecords
      .filter((r) => r.purpose === purpose)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return {
      purpose,
      displayLabel: label(CONSENT_PURPOSE_LABELS, purpose),
      granted: recs[0] ? recs[0].granted : !!(trainee.consentSummary || {})[key],
      since: recs[0] ? recs[0].timestamp : null,
      history: recs.map((r) => ({ granted: r.granted, timestamp: r.timestamp, version: r.version })),
    };
  });

  const initials = trainee.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const certYear = cert ? cert.getFullYear() : new Date(trainee.createdAt).getFullYear();
  const displayId = `TRN-${certYear}-${String(trainee._id).slice(-4).toUpperCase()}`;

  // ================= TIMELINE =================
  const events = [];
  const bandLabel = (b) => (b === 'good' ? 'Good match' : b === 'partial' ? 'Partial match' : 'Mismatch');
  const smVariant = (b) => (b === 'good' ? 'outline-teal' : b === 'partial' ? 'outline-ochre' : 'outline-brick');

  if (cert) {
    events.push({
      id: 'enrolled',
      at: cert.toISOString(),
      _order: 0,
      dateLabel: fmt(cert),
      stage: 'TRAINING',
      categories: [],
      node: 'hollow',
      pending: false,
      headline: `Enrolled — ${course ? course.name : 'Training programme'}`,
      headlineStyle: 'serif',
      detail: [`Batch ${trainee.batchId}`, provider && provider.name].filter(Boolean).join(' · '),
      badges: [],
      insight: null,
      expand: null,
    });
    events.push({
      id: 'certified',
      at: new Date(cert.getTime() + 1).toISOString(),
      _order: 1,
      dateLabel: fmt(cert),
      stage: 'CERTIFICATION',
      categories: [],
      node: '',
      pending: false,
      headline: 'Certified',
      headlineStyle: 'serif',
      detail: `Attendance ${trainee.training.attendancePct}% · Assessment score ${trainee.training.assessmentScore}%`,
      badges: [],
      insight: null,
      expand: null,
    });
  }

  empPeriods.forEach((p, idx) => {
    // a converted apprenticeship + its successor employment at the same
    // employer are one event — render only the "converted" node (below).
    const prior = idx > 0 ? empPeriods[idx - 1] : null;
    if (
      prior &&
      prior.kind === 'apprenticeship' &&
      /convert/i.test(prior.exitReason || '') &&
      prior.employerName === p.employerName
    ) {
      return;
    }

    const v = latestVerForPeriod(p._id);
    const sm = latestSmForPeriod(p._id);
    const isFirst = idx === 0;
    const kindWord =
      p.kind === 'self_employment' ? 'Self-employed' : p.kind === 'apprenticeship' ? 'Apprentice' : 'Employed';
    const stage =
      p.kind === 'self_employment'
        ? 'SELF-EMPLOYMENT'
        : p.kind === 'apprenticeship'
          ? 'APPRENTICESHIP'
          : isFirst
            ? 'PLACEMENT'
            : 'PLACEMENT (RE-EMPLOYMENT)';
    const node =
      v && v.status === 'confirmed'
        ? 'sealed-teal'
        : v && v.status === 'disputed'
          ? 'outline-brick'
          : 'outline-teal';

    const badges = [];
    if (v && v.status === 'confirmed') {
      badges.push({
        text: v.method === 'assisted' ? '● Counsellor-verified' : '● Employer-verified',
        variant: 'solid-teal',
      });
    } else if (v && v.status === 'pending') {
      badges.push({ text: 'Self-reported — awaiting verification', variant: 'outline-teal' });
    } else if (v && (v.status === 'disputed' || v.status === 'no_record')) {
      badges.push({ text: 'Employer disputed — needs review', variant: 'dashed-brick' });
    } else {
      badges.push({ text: 'Self-reported', variant: 'outline-teal' });
    }
    if (sm) badges.push({ text: `Skill match ${sm.score}%`, variant: smVariant(sm.band) });

    // detail: "found within N days of job loss" if re-employment, else "joined N days after certification"
    const priorEnd = empPeriods
      .filter((q) => q.endDate && new Date(q.endDate) <= new Date(p.startDate))
      .map((q) => new Date(q.endDate))
      .sort((a, b) => b - a)[0];
    let detail = p.occupation;
    if (!isFirst && priorEnd) {
      detail += ` · found within ${daysBetween(priorEnd, p.startDate)} days of job loss`;
    } else if (cert) {
      detail += ` · joined ${daysBetween(cert, p.startDate)} days after certification`;
    }

    events.push({
      id: `emp-start-${p._id}`,
      at: new Date(p.startDate).toISOString(),
      _order: 3,
      dateLabel: fmt(p.startDate),
      stage,
      categories: v ? ['outcomes', 'verification'] : ['outcomes'],
      node,
      pending: false,
      headline: `${kindWord} — ${p.employerName}`,
      headlineStyle: 'serif',
      detail,
      badges,
      insight: null,
      expand: {
        title: 'Employment detail',
        rows: [
          ['Employer', p.employerName],
          ['Role', p.occupation],
          ['Type', kindWord],
          ['Started', fmt(p.startDate)],
          ...(v ? [['Verification', `${v.status} (${v.method})${v.respondedAt ? ' · ' + fmt(v.respondedAt) : ''}`]] : []),
          ...(sm
            ? [[
                'Skill match',
                `${sm.score}% (${sm.band})${sm.missingSkills && sm.missingSkills.length ? ' · missing: ' + sm.missingSkills.join(', ') : ''}`,
              ]]
            : []),
        ],
      },
    });
  });

  empPeriods.forEach((p) => {
    if (!p.endDate) return;
    const v = latestVerForPeriod(p._id);
    const tenure = daysBetween(p.startDate, p.endDate);
    const converted = p.kind === 'apprenticeship' && /convert/i.test(p.exitReason || '');
    if (converted) {
      const successor = empPeriods.find(
        (q) => q.kind === 'employment' && q.employerName === p.employerName && new Date(q.startDate) >= new Date(p.endDate),
      );
      const sv = successor ? latestVerForPeriod(successor._id) : null;
      const ssm = successor ? latestSmForPeriod(successor._id) : null;
      const badges = [{ text: 'Converted to full-time role', variant: 'outline-teal' }];
      if (sv && sv.status === 'confirmed') {
        badges.push({ text: '● Employer-verified', variant: 'solid-teal' });
      } else if (sv && sv.status === 'pending') {
        badges.push({ text: 'Self-reported — awaiting verification', variant: 'outline-teal' });
      }
      if (ssm) badges.push({ text: `Skill match ${ssm.score}%`, variant: smVariant(ssm.band) });
      events.push({
        id: `emp-end-${p._id}`,
        at: new Date(p.endDate).toISOString(),
        _order: 3.7,
        dateLabel: fmt(p.endDate),
        stage: 'APPRENTICESHIP · CONVERTED',
        categories: sv ? ['outcomes', 'verification'] : ['outcomes'],
        node: sv && sv.status === 'confirmed' ? 'sealed-teal' : 'outline-teal',
        pending: false,
        headline: `Apprenticeship converted — ${p.employerName}`,
        headlineStyle: 'serif',
        detail: `Converted to employment · apprenticeship tenure ${tenure} days`,
        badges,
        insight: null,
        expand: null,
      });
    } else {
      events.push({
        id: `emp-end-${p._id}`,
        at: new Date(p.endDate).toISOString(),
        _order: 4,
        dateLabel: fmt(p.endDate),
        stage: 'RETENTION',
        categories: v && v.status === 'confirmed' ? ['outcomes', 'verification'] : ['outcomes'],
        node: 'outline-brick',
        pending: false,
        headline: `Job lost — ${p.employerName}`,
        headlineStyle: 'serif',
        detail: `Reason: ${p.exitReason || 'not recorded'} · tenure ${tenure} days`,
        badges: [
          { text: v && v.status === 'confirmed' ? 'Verified employment ended' : 'Employment ended', variant: 'outline-brick' },
        ],
        insight: null,
        expand: null,
      });
    }
  });

  schedules
    .slice()
    .sort((a, b) => a.checkpointDay - b.checkpointDay)
    .forEach((s) => {
      const day = s.checkpointDay;
      const resp = responses.find((r) => String(r.scheduleId) === String(s._id));
      let at;
      let dateLabel;
      let headline;
      let detail;
      let pending = false;
      let expand = null;

      if (s.status === 'completed' && resp) {
        const a = resp.answers || {};
        at = new Date(resp.submittedDate).toISOString();
        dateLabel = fmt(resp.submittedDate);
        headline =
          resp.channel === 'assisted' ? 'Follow-up completed — assisted (field visit)' : 'Follow-up completed';
        const bits = [];
        if (a.status) bits.push(`Reported ${String(a.status).replace(/_/g, ' ')}`);
        if (a.employerName) bits.push(a.employerName);
        if (a.monthlyIncome != null) bits.push(`${inr(a.monthlyIncome)}/mo`);
        if (a.skillsRelevant) bits.push(`skills relevant: ${a.skillsRelevant}`);
        if (a.nonPlacementReason) bits.push(`reason: ${a.nonPlacementReason}`);
        if (resp.channel && resp.channel !== 'assisted') bits.push(`channel: ${resp.channel}`);
        detail = bits.join(' · ');
        expand = {
          title: `Day ${day} follow-up response`,
          rows: [
            ['Status', a.status || '—'],
            ['Employer', a.employerName || '—'],
            ['Role', a.role || '—'],
            ['Monthly income', a.monthlyIncome != null ? inr(a.monthlyIncome) : '—'],
            ['Skills relevant', a.skillsRelevant || '—'],
            ['Channel', resp.channel],
            ['Submitted', fmt(resp.submittedDate)],
          ],
        };
      } else if (s.status === 'completed') {
        at = new Date(s.scheduledDate).toISOString();
        dateLabel = fmt(s.scheduledDate);
        headline = 'Follow-up completed';
        detail = 'No structured response on file';
      } else if (s.status === 'non_responsive') {
        at = new Date(s.escalatedAt || s.scheduledDate).toISOString();
        dateLabel = fmt(s.escalatedAt || s.scheduledDate);
        headline = 'Follow-up — no response';
        detail = `Escalated to counsellor${s.escalatedAt ? ' on ' + fmt(s.escalatedAt) : ''}`;
      } else if (new Date(s.scheduledDate) <= now) {
        at = new Date(s.scheduledDate).toISOString();
        dateLabel = fmt(s.scheduledDate);
        headline = 'Follow-up due';
        detail = `Scheduled ${fmt(s.scheduledDate)} — awaiting response`;
      } else {
        at = new Date(s.scheduledDate).toISOString();
        dateLabel = `${fmt(s.scheduledDate)} · upcoming`;
        headline = 'Follow-up scheduled';
        detail = 'Not yet due';
        pending = true;
      }

      events.push({
        id: `followup-${day}`,
        at,
        _order: 2,
        dateLabel,
        stage: `FOLLOW-UP · DAY ${day}`,
        categories: ['followups'],
        node: 'hollow',
        pending,
        headline,
        headlineStyle: 'sans',
        detail,
        badges: [],
        insight: null,
        expand,
      });
    });

  skillMatches.forEach((sm) => {
    const p = sm.employmentPeriodId ? periodById.get(String(sm.employmentPeriodId)) : null;
    const occ = p ? p.occupation : null;
    const required = occ ? jobRefMap.get(occ) || [] : [];
    const missing = sm.missingSkills || [];
    let detail;
    if (occ && required.length) {
      detail =
        `${occ} requires: ${required.join(', ')} — ` +
        (missing.length ? `missing: ${missing.join(', ')}.` : 'all present in training. No missing skills.');
    } else {
      detail = missing.length ? `Missing: ${missing.join(', ')}.` : 'No missing skills.';
    }
    events.push({
      id: `skill-${sm._id}`,
      at: new Date(sm.computedAt).toISOString(),
      _order: 5,
      dateLabel: fmt(sm.computedAt),
      stage: 'SKILL RELEVANCE',
      categories: [],
      node: 'hollow',
      pending: false,
      headline: 'Skill match recomputed',
      headlineStyle: 'sans',
      detail,
      badges: [],
      insight: null,
      expand: null,
    });
  });

  const latestRcDate = rootCauses.length
    ? rootCauses.map((r) => new Date(r.determinedAt)).sort((a, b) => b - a)[0]
    : null;
  interventions.forEach((iv) => {
    const at = iv.completedAt
      ? new Date(iv.completedAt)
      : latestRcDate
        ? new Date(latestRcDate.getTime() + 1000)
        : trainee.outcomeRisk && trainee.outcomeRisk.computedAt
          ? new Date(trainee.outcomeRisk.computedAt)
          : cert || now;
    const assignee = iv.assignedTo ? (userMap.get(String(iv.assignedTo)) || {}).name : null;
    const statusBadge =
      iv.status === 'completed'
        ? { text: `Completed${assignee ? ' by ' + assignee : ''}`, variant: 'outline-teal' }
        : iv.status === 'in_progress'
          ? { text: `In progress${assignee ? ' · ' + assignee : ''}`, variant: 'outline-ochre' }
          : iv.status === 'dismissed'
            ? { text: 'Dismissed', variant: 'neutral' }
            : { text: 'Awaiting counsellor review', variant: 'outline-ochre' };

    const basisParts = [];
    if (latestSm) basisParts.push(`skill match ${latestSm.score}%`);
    if (trainee.training && trainee.training.assessmentScore != null) {
      basisParts.push(`assessment ${trainee.training.assessmentScore}%`);
    }
    if (trainee.training && trainee.training.attendancePct != null) {
      basisParts.push(`attendance ${trainee.training.attendancePct}%`);
    }
    if (rootCausesOut[0]) {
      basisParts.push(`root cause: ${rootCausesOut[0].displayLabel} (${rootCausesOut[0].source.replace(/_/g, ' ')})`);
    }

    events.push({
      id: `intervention-${iv._id}`,
      at: at.toISOString(),
      _order: 2.5,
      dateLabel: null,
      stage: 'INTERVENTION',
      categories: ['interventions'],
      node: 'hollow',
      pending: false,
      headline: null,
      headlineStyle: 'sans',
      detail: null,
      badges: [],
      insight: {
        label: `System insight — ${label(INTERVENTION_LABELS, iv.type)}`,
        body:
          (iv.rationale || `Recommended intervention: ${label(INTERVENTION_LABELS, iv.type)}.`) +
          (iv.outcomeNotes ? ` Outcome: ${iv.outcomeNotes}` : ''),
        basis: basisParts.length ? `Based on: ${basisParts.join(', ')}.` : null,
        badges: [statusBadge],
      },
      expand: null,
    });
  });

  events.sort((a, b) => new Date(a.at) - new Date(b.at) || (a._order || 0) - (b._order || 0));
  events.forEach((e) => delete e._order);

  return {
    generatedAt: now.toISOString(),
    trainee: {
      id: String(trainee._id),
      name: trainee.name,
      initials,
      displayId,
      contact: trainee.contact,
      district: trainee.district,
      demographicTags: trainee.demographicTags,
      course: course ? { id: String(course._id), name: course.name, skillTags: course.skillTags || [] } : null,
      provider: provider ? { id: String(provider._id), name: provider.name, district: provider.district } : null,
      batchId: trainee.batchId,
      training: {
        attendancePct: trainee.training ? trainee.training.attendancePct : null,
        assessmentScore: trainee.training ? trainee.training.assessmentScore : null,
        certified: trainee.training ? trainee.training.certified : false,
        certificationDate: trainee.training ? trainee.training.certificationDate : null,
        daysSinceCertification: daysAgo(cert),
      },
      currentStatus: trainee.currentStatus,
      currentStatusLabel: label(STATUS_LABELS, trainee.currentStatus),
      currentConfidence: trainee.currentConfidence,
      currentConfidenceLabel: label(CONFIDENCE_LABELS, trainee.currentConfidence),
      outcomeRisk: trainee.outcomeRisk,
      attritionRisk: trainee.attritionRisk,
    },
    currentEmployment,
    jobChanges: outcomeEvents.filter((e) => e.type === 'job_lost').length,
    wageProgression,
    skillMatch: skillMatchOut,
    followups,
    interventions: interventionsOut,
    rootCauses: rootCausesOut,
    consent,
    verifications: verifications.map((v) => ({
      id: String(v._id),
      method: v.method,
      employerName: v.employerName,
      claim: v.claim,
      status: v.status,
      respondedAt: v.respondedAt,
      employmentPeriodId: v.employmentPeriodId ? String(v.employmentPeriodId) : null,
    })),
    employmentPeriods: empPeriods.map((p) => ({
      id: String(p._id),
      kind: p.kind,
      employerName: p.employerName,
      occupation: p.occupation,
      startDate: p.startDate,
      endDate: p.endDate,
      exitReason: p.exitReason,
      isActive: !p.endDate,
      tenureDays: daysBetween(p.startDate, p.endDate || now),
    })),
    timeline: events,
  };
}

async function buildTraineeList({ providerId, district, status, risk } = {}) {
  const q = {};
  if (providerId && mongoose.isValidObjectId(providerId)) q.providerId = providerId;
  if (district) q.district = district;
  if (status) q.currentStatus = status;
  if (risk) q['outcomeRisk.band'] = risk;

  const [trainees, courses, providers] = await Promise.all([
    Trainee.find(q).sort({ 'outcomeRisk.score': -1, name: 1 }).lean(),
    Course.find().lean(),
    Provider.find().lean(),
  ]);
  const cmap = new Map(courses.map((c) => [String(c._id), c]));
  const pmap = new Map(providers.map((p) => [String(p._id), p]));

  const traineeIds = trainees.map((t) => t._id);
  const disputedVers = traineeIds.length
    ? await Verification.find({ traineeId: { $in: traineeIds }, status: { $in: ['disputed', 'no_record'] } }).lean()
    : [];
  const needsReviewSet = new Set(disputedVers.map((v) => String(v.traineeId)));

  return {
    generatedAt: new Date().toISOString(),
    count: trainees.length,
    trainees: trainees.map((t) => {
      const band = (t.outcomeRisk && t.outcomeRisk.band) || 'low';
      const flags = [];
      if (band === 'high' || band === 'medium') flags.push('at_risk');
      if (t.currentStatus === 'not_responding') flags.push('non_responsive');
      if (needsReviewSet.has(String(t._id))) flags.push('needs_review');
      return {
        id: String(t._id),
        name: t.name,
        initials: t.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join(''),
        district: t.district,
        batchId: t.batchId,
        course: (cmap.get(String(t.courseId)) || {}).name || null,
        provider: (pmap.get(String(t.providerId)) || {}).name || null,
        currentStatus: t.currentStatus,
        currentStatusLabel: label(STATUS_LABELS, t.currentStatus),
        currentConfidence: t.currentConfidence,
        outcomeRisk: {
          score: (t.outcomeRisk && t.outcomeRisk.score) || 0,
          band,
        },
        flags,
        certificationDate: t.training ? t.training.certificationDate : null,
      };
    }),
  };
}

module.exports = { buildTraineeProfile, buildTraineeList };
