const express = require('express');
const router = express.Router();
const { Verification, Trainee } = require('../models');

// GET /api/employer/dashboard  — employer's verification inbox
router.get('/dashboard', async (req, res, next) => {
  try {
    const verifications = await Verification.find({ status: 'pending' })
      .populate('traineeId', 'name contact currentStatus verificationLevel')
      .sort({ createdAt: -1 });

    const responded = await Verification.find({ status: { $in: ['confirmed', 'disputed', 'no_record'] } })
      .populate('traineeId', 'name')
      .sort({ respondedAt: -1 })
      .limit(20);

    res.json({
      pending: verifications.map((v) => ({
        id: String(v._id),
        trainee: v.traineeId.name,
        role: v.claim?.role || 'Unknown',
        joinDate: v.claim?.joinDate,
        status: v.status,
        createdAt: v.createdAt,
      })),
      recentResponses: responded.length,
      verified: responded.filter((v) => v.status === 'confirmed').length,
      disputed: responded.filter((v) => v.status === 'disputed').length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/employer/verify/:verificationId  { status: confirmed|disputed, notes }
router.post('/verify/:verificationId', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const v = await Verification.findById(req.params.verificationId);
    if (!v) {
      const e = new Error('Verification not found');
      e.status = 404;
      throw e;
    }

    v.status = status;
    v.respondedAt = new Date();
    if (notes) v.notes = notes;
    await v.save();

    // If confirmed, update trainee verification level to L4
    if (status === 'confirmed') {
      const trainee = await Trainee.findById(v.traineeId);
      trainee.verificationLevel = 4;
      trainee.verificationSource = 'employer_verified';
      trainee.verificationHistory.push({
        level: 4,
        source: 'employer_verified',
        actor: 'employer',
        date: new Date(),
      });
      await trainee.save();
    }

    res.json({ success: true, verification: { id: String(v._id), status: v.status } });
  } catch (err) {
    next(err);
  }
});

// GET /api/employer/stats  — quick summary for topbar
router.get('/stats', async (req, res, next) => {
  try {
    const pending = await Verification.countDocuments({ status: 'pending' });
    const confirmed = await Verification.countDocuments({ status: 'confirmed' });
    res.json({ pending, confirmed, responseRate: pending + confirmed > 0 ? Math.round((confirmed / (confirmed + pending)) * 100) : 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
