const router = require('express').Router();
const mongoose = require('mongoose');
const { Trainee, EmploymentPeriod, Verification, AuditLog } = require('../models');

// GET /api/verifications?employer=&status=   — list (employer dashboard)
router.get('/', async (req, res, next) => {
  try {
    const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : null);
    const q = {};
    if (norm(req.query.employer)) q.employerName = norm(req.query.employer);
    if (norm(req.query.status)) q.status = norm(req.query.status);
    const vers = await Verification.find(q).lean();
    const trainees = await Trainee.find({ _id: { $in: vers.map((v) => v.traineeId) } }).lean();
    const tmap = new Map(trainees.map((t) => [String(t._id), t]));
    res.json({
      count: vers.length,
      verifications: vers.map((v) => ({
        id: String(v._id),
        traineeId: String(v.traineeId),
        traineeName: (tmap.get(String(v.traineeId)) || {}).name || '—',
        employerName: v.employerName,
        method: v.method,
        claim: v.claim,
        status: v.status,
        respondedAt: v.respondedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/verifications/:id  — single request (employer link screen, no auth)
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Verification request not found');
      e.status = 404;
      throw e;
    }
    const v = await Verification.findById(req.params.id).lean();
    if (!v) {
      const e = new Error('Verification request not found');
      e.status = 404;
      throw e;
    }
    const trainee = await Trainee.findById(v.traineeId).lean();
    const period = v.employmentPeriodId ? await EmploymentPeriod.findById(v.employmentPeriodId).lean() : null;
    res.json({
      id: String(v._id),
      status: v.status,
      method: v.method,
      employerName: v.employerName,
      respondedAt: v.respondedAt,
      trainee: trainee ? { id: String(trainee._id), name: trainee.name } : null,
      claim: {
        role: (v.claim && v.claim.role) || (period && period.occupation) || null,
        joinDate: (v.claim && v.claim.joinDate) || (period && period.startDate) || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/verifications/:id/respond  { status: confirmed|disputed|no_record }
router.post('/:id/respond', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Verification request not found');
      e.status = 404;
      throw e;
    }
    const { status, actorRole = 'employer' } = req.body;
    if (!['confirmed', 'disputed', 'no_record'].includes(status)) {
      const e = new Error('status must be confirmed, disputed or no_record');
      e.status = 400;
      throw e;
    }
    const v = await Verification.findByIdAndUpdate(
      req.params.id,
      { status, respondedAt: new Date() },
      { new: true },
    );
    if (!v) {
      const e = new Error('Verification request not found');
      e.status = 404;
      throw e;
    }
    await AuditLog.create({
      entity: 'Verification', entityId: v._id, action: `verification_${status}`, actorRole,
    });
    res.json({ verification: { id: String(v._id), status: v.status, respondedAt: v.respondedAt } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
