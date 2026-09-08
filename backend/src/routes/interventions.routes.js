const router = require('express').Router();
const mongoose = require('mongoose');
const { Intervention, AuditLog } = require('../models');

const IV_TYPES = [
  'bridge_course_referral', 'employer_referral_drive', 'career_counselling',
  'interview_prep_session', 'relocation_or_remote_referral', 'general_counselling',
  're_employment_support',
];
const IV_STATUS = ['recommended', 'in_progress', 'completed', 'dismissed'];

// POST /api/interventions — create (used when Approve fires with no recommended row)
router.post('/', async (req, res, next) => {
  try {
    const { traineeId, type, rationale = '', recommendedBy = 'counsellor', assignedTo, actorRole = 'counsellor' } = req.body;
    if (!mongoose.isValidObjectId(traineeId)) {
      const e = new Error('Valid traineeId is required');
      e.status = 400;
      throw e;
    }
    if (!IV_TYPES.includes(type)) {
      const e = new Error('Unknown intervention type');
      e.status = 400;
      throw e;
    }
    const iv = await Intervention.create({
      traineeId,
      type,
      rationale,
      recommendedBy: recommendedBy === 'system' ? 'system' : 'counsellor',
      assignedTo: assignedTo && mongoose.isValidObjectId(assignedTo) ? assignedTo : null,
      status: 'in_progress',
    });
    await AuditLog.create({
      entity: 'Intervention', entityId: iv._id, action: 'intervention_created', actorRole,
    });
    res.status(201).json({ intervention: iv });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/interventions/:id — approve (in_progress) / dismiss / reassign / complete
router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Intervention not found');
      e.status = 404;
      throw e;
    }
    const { status, assignedTo, outcomeNotes, actorRole = 'counsellor' } = req.body;
    const update = {};
    if (status !== undefined) {
      if (!IV_STATUS.includes(status)) {
        const e = new Error('Invalid status');
        e.status = 400;
        throw e;
      }
      if (status === 'dismissed' && !(outcomeNotes && String(outcomeNotes).trim())) {
        const e = new Error('A reason is required to dismiss a recommendation');
        e.status = 400;
        throw e;
      }
      update.status = status;
      if (status === 'completed') update.completedAt = new Date();
    }
    if (assignedTo !== undefined) {
      update.assignedTo = assignedTo && mongoose.isValidObjectId(assignedTo) ? assignedTo : null;
    }
    if (outcomeNotes !== undefined) update.outcomeNotes = outcomeNotes;

    const iv = await Intervention.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!iv) {
      const e = new Error('Intervention not found');
      e.status = 404;
      throw e;
    }
    await AuditLog.create({
      entity: 'Intervention',
      entityId: iv._id,
      action: `intervention_${status || 'updated'}`,
      actorRole,
    });
    res.json({ intervention: iv });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
