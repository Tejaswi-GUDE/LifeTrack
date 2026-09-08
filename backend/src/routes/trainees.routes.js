const router = require('express').Router();
const mongoose = require('mongoose');
const { buildTraineeProfile, buildTraineeList } = require('../lib/traineeProfile');
const { buildTraineeRisk } = require('../lib/riskCenter');
const { Trainee, ConsentRecord, AuditLog } = require('../models');

const PURPOSE_KEY = { data_collection: 'dataCollection', employer_contact: 'employerContact', analytics: 'analytics' };

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
