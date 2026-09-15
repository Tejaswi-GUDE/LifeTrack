const router = require('express').Router();
const mongoose = require('mongoose');
const { buildTraineeProfile, buildTraineeList } = require('../lib/traineeProfile');
const { buildTraineeRisk } = require('../lib/riskCenter');
const {
  Trainee, Course, Provider, ConsentRecord, AuditLog,
  EmploymentPeriod, IncomeCheckpoint, Verification, OutcomeEvent, FollowupSchedule,
} = require('../models');

const PURPOSE_KEY = { data_collection: 'dataCollection', employer_contact: 'employerContact', analytics: 'analytics' };

// employment "kind" → Trainee.currentStatus / OutcomeEvent.type
const KIND_TO_STATUS = { employment: 'employed', self_employment: 'self_employed', apprenticeship: 'apprentice' };
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

// GET /api/trainees?providerId=&district=&status=&risk=
router.get('/', async (req, res, next) => {
  try {
    const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : undefined);
    const data = await buildTraineeList({
      providerId: norm(req.query.providerId),
      district: norm(req.query.district),
      status: norm(req.query.status),
      risk: norm(req.query.risk),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/trainees — register a new trainee (name, course, provider, training record)
router.post('/', async (req, res, next) => {
  try {
    const {
      name, contact, district, courseId, providerId, batchId,
      attendancePct, assessmentScore, certificationDate,
      completionStatus, certified, skills,
      gender, ageBand, actorRole = 'provider',
    } = req.body || {};

    const missing = ['name', 'contact', 'district', 'courseId', 'providerId', 'batchId'].filter((k) => !req.body || !req.body[k]);
    if (missing.length) {
      const e = new Error(`Missing required field(s): ${missing.join(', ')}`);
      e.status = 400;
      throw e;
    }
    if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(providerId)) {
      const e = new Error('courseId and providerId must be valid ids');
      e.status = 400;
      throw e;
    }
    const [course, provider] = await Promise.all([Course.findById(courseId).lean(), Provider.findById(providerId).lean()]);
    if (!course) { const e = new Error('Course not found'); e.status = 400; throw e; }
    if (!provider) { const e = new Error('Provider not found'); e.status = 400; throw e; }

    // completion status → certified flag + current status
    let comp = ['in_training', 'completed', 'dropped_out'].includes(completionStatus) ? completionStatus : null;
    if (!comp) comp = certified === false ? 'in_training' : 'completed';
    const isCertified = comp === 'completed';
    const STATUS_BY_COMPLETION = { in_training: 'in_training', completed: 'certified_no_outcome', dropped_out: 'dropped_out' };
    const currentStatus = STATUS_BY_COMPLETION[comp];

    const num = (v, def) => (v == null || v === '' ? def : Math.max(0, Math.min(100, Number(v))));
    const certDate = isCertified ? (certificationDate ? new Date(certificationDate) : new Date()) : null;

    const cleanSkills = Array.isArray(skills)
      ? [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))]
      : null;

    const trainee = await Trainee.create({
      name: String(name).trim(),
      contact: String(contact).trim(),
      district: String(district).trim(),
      demographicTags: {
        gender: ['male', 'female', 'other', 'undisclosed'].includes(gender) ? gender : 'undisclosed',
        ageBand: ['18-24', '25-34', '35-44', '45+'].includes(ageBand) ? ageBand : '18-24',
      },
      courseId,
      providerId,
      batchId: String(batchId).trim(),
      skills: cleanSkills && cleanSkills.length ? cleanSkills : (course.skillTags || []),
      training: {
        attendancePct: num(attendancePct, 0),
        assessmentScore: num(assessmentScore, 0),
        certified: isCertified,
        certificationDate: certDate,
      },
      currentStatus,
      currentConfidence: 'low',
      outcomeRisk: { score: 0, band: 'low', factors: [], computedAt: new Date() },
      attritionRisk: { score: 0, band: 'low', factors: [], computedAt: new Date() },
      consentSummary: { dataCollection: true, employerContact: false, analytics: false },
    });

    await ConsentRecord.create({
      traineeId: trainee._id, purpose: 'data_collection', granted: true, version: 1, timestamp: new Date(),
    });
    // schedule a first check-in for anyone still being tracked (not for drop-outs)
    if (comp !== 'dropped_out') {
      await FollowupSchedule.create({
        traineeId: trainee._id,
        checkpointDay: 30,
        scheduledDate: certDate ? new Date(certDate.getTime() + 30 * 86400000) : daysFromNow(30),
        status: 'pending',
      });
    }
    await AuditLog.create({
      entity: 'Trainee', entityId: trainee._id, action: 'trainee_created', actorRole,
    });

    res.status(201).json({ trainee: { id: String(trainee._id), name: trainee.name } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/trainees/:id/consent  { purpose, granted }  (PRD §21 — versioned, append-only history)
router.patch('/:id/consent', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const { purpose, granted, actorRole = 'trainee' } = req.body;
    if (!PURPOSE_KEY[purpose]) {
      const e = new Error('purpose must be data_collection, employer_contact or analytics');
      e.status = 400;
      throw e;
    }
    const trainee = await Trainee.findById(req.params.id);
    if (!trainee) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const last = await ConsentRecord.find({ traineeId: trainee._id, purpose }).sort({ version: -1 }).limit(1).lean();
    const version = (last[0] ? last[0].version : 0) + 1;
    await ConsentRecord.create({ traineeId: trainee._id, purpose, granted: !!granted, version, timestamp: new Date() });
    trainee.consentSummary = { ...trainee.consentSummary, [PURPOSE_KEY[purpose]]: !!granted };
    await trainee.save();
    await AuditLog.create({
      entity: 'Trainee', entityId: trainee._id, action: `consent_${granted ? 'granted' : 'revoked'}_${purpose}`, actorRole,
    });
    res.json({ consentSummary: trainee.consentSummary, purpose, granted: !!granted, version });
  } catch (err) {
    next(err);
  }
});

// POST /api/trainees/:id/employment — record a new job / self-employment / apprenticeship
router.post('/:id/employment', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const trainee = await Trainee.findById(req.params.id);
    if (!trainee) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const {
      employerName, occupation, kind = 'employment', startDate,
      monthlyIncome, requestVerification = true, actorRole = 'provider',
    } = req.body || {};

    if (!employerName || !String(employerName).trim()) { const e = new Error('employerName is required'); e.status = 400; throw e; }
    if (!occupation || !String(occupation).trim()) { const e = new Error('occupation is required'); e.status = 400; throw e; }
    if (!KIND_TO_STATUS[kind]) { const e = new Error('kind must be employment, self_employment or apprenticeship'); e.status = 400; throw e; }

    const start = startDate ? new Date(startDate) : new Date();

    // close any currently-active spell
    await EmploymentPeriod.updateMany(
      { traineeId: trainee._id, endDate: null },
      { $set: { endDate: start, isActive: false, exitReason: 'Superseded by a newer record' } },
    );

    const period = await EmploymentPeriod.create({
      traineeId: trainee._id,
      kind,
      employerName: String(employerName).trim(),
      occupation: String(occupation).trim(),
      startDate: start,
      endDate: null,
      isActive: true,
    });

    await OutcomeEvent.create({
      traineeId: trainee._id, type: KIND_TO_STATUS[kind], source: 'provider', occurredAt: start,
      notes: `Recorded via provider entry — ${period.employerName}`,
    });

    let incomeCheckpoint = null;
    if (monthlyIncome != null && monthlyIncome !== '' && Number(monthlyIncome) > 0) {
      incomeCheckpoint = await IncomeCheckpoint.create({
        traineeId: trainee._id,
        employmentPeriodId: period._id,
        checkpointDay: 0,
        amountInr: Number(monthlyIncome),
        recordedDate: new Date(),
      });
    }

    let verification = null;
    if (requestVerification && kind === 'employment') {
      verification = await Verification.create({
        traineeId: trainee._id,
        employmentPeriodId: period._id,
        method: 'employer',
        employerName: period.employerName,
        claim: { role: period.occupation, joinDate: start },
        status: 'pending',
        respondedAt: null,
      });
    }

    trainee.currentStatus = KIND_TO_STATUS[kind];
    trainee.currentConfidence = 'medium';
    await trainee.save();

    await AuditLog.create({
      entity: 'EmploymentPeriod', entityId: period._id, action: 'employment_recorded', actorRole,
    });

    res.status(201).json({
      employmentPeriod: { id: String(period._id), employerName: period.employerName, occupation: period.occupation, kind, startDate: start },
      incomeCheckpoint: incomeCheckpoint ? { id: String(incomeCheckpoint._id), amountInr: incomeCheckpoint.amountInr } : null,
      verificationRequested: !!verification,
      currentStatus: trainee.currentStatus,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/trainees/:id/income — record a wage / income checkpoint
router.post('/:id/income', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const trainee = await Trainee.findById(req.params.id).lean();
    if (!trainee) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const { amountInr, checkpointDay = 90, actorRole = 'provider' } = req.body || {};
    if (amountInr == null || amountInr === '' || Number(amountInr) <= 0) {
      const e = new Error('A positive amountInr is required');
      e.status = 400;
      throw e;
    }
    if (![0, 30, 90, 180, 365].includes(Number(checkpointDay))) {
      const e = new Error('checkpointDay must be one of 0, 30, 90, 180, 365');
      e.status = 400;
      throw e;
    }
    const activePeriod = await EmploymentPeriod.findOne({ traineeId: trainee._id, endDate: null }).lean();
    const checkpoint = await IncomeCheckpoint.create({
      traineeId: trainee._id,
      employmentPeriodId: activePeriod ? activePeriod._id : null,
      checkpointDay: Number(checkpointDay),
      amountInr: Number(amountInr),
      recordedDate: new Date(),
    });
    await AuditLog.create({
      entity: 'IncomeCheckpoint', entityId: checkpoint._id, action: 'income_recorded', actorRole,
    });
    res.status(201).json({ incomeCheckpoint: { id: String(checkpoint._id), amountInr: checkpoint.amountInr, checkpointDay: checkpoint.checkpointDay } });
  } catch (err) {
    next(err);
  }
});

// POST /api/trainees/:id/verification-request — ask the employer of the active job to confirm it
router.post('/:id/verification-request', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const trainee = await Trainee.findById(req.params.id).lean();
    if (!trainee) {
      const e = new Error('Trainee not found');
      e.status = 404;
      throw e;
    }
    const activePeriod = await EmploymentPeriod.findOne({ traineeId: trainee._id, endDate: null }).lean();
    if (!activePeriod) {
      const e = new Error('This trainee has no active employment to verify');
      e.status = 400;
      throw e;
    }
    const existing = await Verification.findOne({ employmentPeriodId: activePeriod._id, status: 'pending' }).lean();
    if (existing) {
      return res.json({ verification: { id: String(existing._id), status: existing.status }, alreadyPending: true });
    }
    const verification = await Verification.create({
      traineeId: trainee._id,
      employmentPeriodId: activePeriod._id,
      method: activePeriod.kind === 'self_employment' ? 'assisted' : 'employer',
      employerName: activePeriod.employerName,
      claim: { role: activePeriod.occupation, joinDate: activePeriod.startDate },
      status: 'pending',
      respondedAt: null,
    });
    await AuditLog.create({
      entity: 'Verification', entityId: verification._id, action: 'verification_requested', actorRole: (req.body && req.body.actorRole) || 'provider',
    });
    res.status(201).json({ verification: { id: String(verification._id), status: verification.status } });
  } catch (err) {
    next(err);
  }
});

// GET /api/trainees/:id/risk — risk bundle for the Risk & Intervention Center
router.get('/:id/risk', async (req, res, next) => {
  try {
    res.json(await buildTraineeRisk(req.params.id));
  } catch (err) {
    next(err);
  }
});

// GET /api/trainees/:id — full profile + merged career timeline
router.get('/:id', async (req, res, next) => {
  try {
    res.json(await buildTraineeProfile(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
