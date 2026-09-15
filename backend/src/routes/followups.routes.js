const router = require('express').Router();
const mongoose = require('mongoose');
const {
  Trainee, Course, EmploymentPeriod, JobSkillReference,
  FollowupSchedule, FollowupResponse, AuditLog,
} = require('../models');
const { buildSkillIntel } = require('../lib/skillIntel');

// The conversational check-in (PRD §12). The skills question is injected
// dynamically per trainee (see resolveQuestions) — it lists the skills their
// current/target role needs and asks which they already have.
const BASE_QUESTIONS = [
  { id: 'status', type: 'choice', prompt: 'Are you currently…', options: ['employed', 'self_employed', 'apprentice', 'studying', 'unemployed'] },
  { id: 'employerName', type: 'text', prompt: 'What is your current employer / business name?', showIf: { status: ['employed', 'self_employed', 'apprentice'] } },
  { id: 'role', type: 'text', prompt: 'What is your role?', showIf: { status: ['employed', 'self_employed', 'apprentice'] } },
  { id: 'monthlyIncome', type: 'number', prompt: 'What is your current monthly income? (optional)' },
  // <- skills question injected here (index 4)
  { id: 'nonPlacementReason', type: 'choice', prompt: 'What is the main reason?', options: ['no suitable openings', 'salary mismatch', 'failed interviews', 'location / relocation', 'pursuing further study', 'personal reasons', 'other'], showIf: { status: ['unemployed', 'studying'] } },
];

const lc = (s) => String(s || '').toLowerCase();

async function resolveSkillContext(trainee) {
  const [course, activePeriod, jobRefs] = await Promise.all([
    Course.findById(trainee.courseId).lean(),
    EmploymentPeriod.findOne({ traineeId: trainee._id, endDate: null }).lean(),
    JobSkillReference.find().lean(),
  ]);
  const intel = buildSkillIntel({ trainee, course, activePeriod, jobRefs });
  const skillOptions = intel.required.length ? intel.required : intel.taught;
  return { intel, skillOptions };
}

function resolveQuestions(skillOptions, targetOccupation) {
  const questions = BASE_QUESTIONS.slice();
  const skillQuestion = skillOptions.length
    ? {
        id: 'skillsHave',
        type: 'multiselect',
        prompt: `Which of the skills ${targetOccupation ? `${targetOccupation} needs` : 'your job needs'} do you already have? (tick all that apply)`,
        options: skillOptions,
        showIf: { status: ['employed', 'self_employed', 'apprentice'] },
      }
    : {
        id: 'skillsRelevant',
        type: 'choice',
        prompt: 'Does your work use the skills from your training?',
        options: ['yes', 'partially', 'no'],
        showIf: { status: ['employed', 'self_employed', 'apprentice'] },
      };
  questions.splice(4, 0, skillQuestion);
  return questions;
}

// A pending check-in is "due" once it is overdue OR falls inside the next
// 30-day action window (the window a counsellor/provider actually works from);
// anything further out is "scheduled".
const DUE_WINDOW_DAYS = 30;
function derivedStatus(s, now) {
  if (s.status === 'completed') return 'completed';
  if (s.status === 'non_responsive') return 'non_responsive';
  const days = (new Date(s.scheduledDate) - now) / 86400000;
  return days <= DUE_WINDOW_DAYS ? 'due' : 'scheduled';
}

// GET /api/followups?providerId=&traineeId=&status=
router.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : null);
    const providerId = norm(req.query.providerId);
    const traineeId = norm(req.query.traineeId);
    const statusFilter = norm(req.query.status);

    let traineeQuery = {};
    if (providerId && mongoose.isValidObjectId(providerId)) traineeQuery.providerId = providerId;
    if (traineeId && mongoose.isValidObjectId(traineeId)) traineeQuery._id = traineeId;
    const [trainees, courses] = await Promise.all([Trainee.find(traineeQuery).lean(), Course.find().lean()]);
    const tmap = new Map(trainees.map((t) => [String(t._id), t]));
    const cmap = new Map(courses.map((c) => [String(c._id), c]));

    const schedules = await FollowupSchedule.find({ traineeId: { $in: trainees.map((t) => t._id) } }).lean();
    const responses = await FollowupResponse.find({ scheduleId: { $in: schedules.map((s) => s._id) } }).lean();
    const respBySchedule = new Map(responses.map((r) => [String(r.scheduleId), r]));

    let rows = schedules.map((s) => {
      const t = tmap.get(String(s.traineeId));
      const r = respBySchedule.get(String(s._id));
      return {
        id: String(s._id),
        traineeId: String(s.traineeId),
        traineeName: t ? t.name : '—',
        course: t ? (cmap.get(String(t.courseId)) || {}).name || null : null,
        district: t ? t.district : null,
        checkpointDay: s.checkpointDay,
        adhoc: !!s.adhoc,
        note: s.note || null,
        requestedByRole: s.requestedByRole || null,
        scheduledDate: s.scheduledDate,
        status: derivedStatus(s, now),
        rawStatus: s.status,
        escalatedAt: s.escalatedAt || null,
        respondedAt: r ? r.submittedDate : null,
        channel: r ? r.channel : null,
        answers: r ? r.answers : null,
      };
    });

    if (statusFilter) rows = rows.filter((x) => x.status === statusFilter);
    rows.sort((a, b) => {
      const order = { due: 0, non_responsive: 1, scheduled: 2, completed: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || new Date(a.scheduledDate) - new Date(b.scheduledDate);
    });

    const counts = rows.reduce((acc, x) => ((acc[x.status] = (acc[x.status] || 0) + 1), acc), {});
    res.json({ generatedAt: now.toISOString(), count: rows.length, counts, followups: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/followups  { traineeId, note?, requestedByRole? }
// A provider/counsellor asks a trainee to complete a check-in now. Creates an
// ad-hoc pending schedule dated today, so it shows immediately as "Due" in the
// trainee's follow-ups and can be answered with the normal check-in form.
router.post('/', async (req, res, next) => {
  try {
    const { traineeId, note, requestedByRole = 'provider' } = req.body || {};
    if (!mongoose.isValidObjectId(traineeId)) {
      const e = new Error('A valid traineeId is required');
      e.status = 400;
      throw e;
    }
    const trainee = await Trainee.findById(traineeId).lean();
    if (!trainee) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const role = ['provider', 'counsellor', 'government'].includes(requestedByRole) ? requestedByRole : 'provider';
    const schedule = await FollowupSchedule.create({
      traineeId,
      checkpointDay: null,
      adhoc: true,
      requestedByRole: role,
      note: note && String(note).trim() ? String(note).trim().slice(0, 500) : null,
      scheduledDate: new Date(),
      status: 'pending',
    });
    await AuditLog.create({
      entity: 'FollowupSchedule', entityId: schedule._id, action: 'followup_requested', actorRole: role,
    });
    res.status(201).json({
      followup: {
        id: String(schedule._id),
        traineeId: String(schedule.traineeId),
        traineeName: trainee.name,
        adhoc: true,
        note: schedule.note,
        scheduledDate: schedule.scheduledDate,
        status: 'due',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/followups/:scheduleId/questions
router.get('/:scheduleId/questions', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.scheduleId)) {
      const e = new Error('Follow-up not found');
      e.status = 404;
      throw e;
    }
    const s = await FollowupSchedule.findById(req.params.scheduleId).lean();
    if (!s) {
      const e = new Error('Follow-up not found');
      e.status = 404;
      throw e;
    }
    const t = await Trainee.findById(s.traineeId).lean();
    const { intel, skillOptions } = t ? await resolveSkillContext(t) : { intel: {}, skillOptions: [] };
    res.json({
      scheduleId: String(s._id),
      checkpointDay: s.checkpointDay,
      scheduledDate: s.scheduledDate,
      status: s.status,
      traineeName: t ? t.name : null,
      targetOccupation: intel.targetOccupation || null,
      requiredSkills: skillOptions,
      skillsAlreadyHeld: intel.has || [],
      questions: resolveQuestions(skillOptions, intel.targetOccupation),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/followups/:scheduleId/response  { channel, answers }
router.post('/:scheduleId/response', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.scheduleId)) {
      const e = new Error('Follow-up not found');
      e.status = 404;
      throw e;
    }
    const schedule = await FollowupSchedule.findById(req.params.scheduleId);
    if (!schedule) {
      const e = new Error('Follow-up not found');
      e.status = 404;
      throw e;
    }
    const { channel = 'web', answers = {}, actorRole = 'trainee' } = req.body;

    const skillsHave = Array.isArray(answers.skillsHave)
      ? [...new Set(answers.skillsHave.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()))]
      : null;

    // derive the old yes/partially/no rating from the ticked skills
    let skillsRelevant = ['yes', 'partially', 'no'].includes(answers.skillsRelevant) ? answers.skillsRelevant : null;
    if (skillsHave) {
      const trainee = await Trainee.findById(schedule.traineeId).lean();
      const { intel } = trainee ? await resolveSkillContext(trainee) : { intel: { required: [] } };
      const req0 = (intel.required || []).map(lc);
      if (req0.length) {
        const haveLc = new Set(skillsHave.map(lc));
        const covered = req0.filter((s) => haveLc.has(s)).length;
        skillsRelevant = covered === req0.length ? 'yes' : covered > 0 ? 'partially' : 'no';
      }
      // grow the trainee's held-skills list
      if (skillsHave.length) {
        await Trainee.updateOne({ _id: schedule.traineeId }, { $addToSet: { skills: { $each: skillsHave } } });
      }
    }

    const response = await FollowupResponse.create({
      scheduleId: schedule._id,
      traineeId: schedule.traineeId,
      channel,
      answers: {
        status: answers.status || null,
        employerName: answers.employerName || null,
        role: answers.role || null,
        startDate: answers.startDate || null,
        monthlyIncome: answers.monthlyIncome != null && answers.monthlyIncome !== '' ? Number(answers.monthlyIncome) : null,
        skillsHave: skillsHave && skillsHave.length ? skillsHave : undefined,
        skillsRelevant,
        nonPlacementReason: answers.nonPlacementReason || null,
      },
      submittedDate: new Date(),
    });
    schedule.status = 'completed';
    await schedule.save();
    await AuditLog.create({
      entity: 'FollowupSchedule', entityId: schedule._id, action: 'followup_response_submitted', actorRole,
    });
    res.status(201).json({ response, schedule: { id: String(schedule._id), status: schedule.status } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
