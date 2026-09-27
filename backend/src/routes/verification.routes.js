const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { Trainee, Evidence, OutcomeEvent } = require('../models');

// POST /api/verification/upload-evidence
router.post('/upload-evidence', requireAuth, async (req, res) => {
  try {
    const { traineeId, type, fileUrl, fileName } = req.body;
    const evidence = new Evidence({ traineeId, type, fileUrl, fileName });
    await evidence.save();
    res.json({ success: true, evidence });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/verification/review-evidence
router.post('/review-evidence', requireAuth, async (req, res) => {
  try {
    const { evidenceId, status, notes } = req.body;
    const evidence = await Evidence.findById(evidenceId);
    if (!evidence) return res.status(404).json({ error: 'Evidence not found' });

    evidence.status = status;
    evidence.notes = notes;
    evidence.reviewedBy = req.session.name;
    evidence.reviewedAt = new Date();
    await evidence.save();

    // If approved, bump verification level to L3 (provider-verified)
    if (status === 'approved') {
      const trainee = await Trainee.findById(evidence.traineeId);
      trainee.verificationLevel = 3;
      trainee.verificationSource = 'provider_evidence';
      trainee.verificationHistory.push({
        level: 3,
        source: 'provider_evidence',
        actor: req.session.name,
        date: new Date(),
      });
      await trainee.save();

      // Log outcome event
      await OutcomeEvent.create({
        traineeId: evidence.traineeId,
        type: trainee.status,
        verificationLevel: 3,
        reportedVia: 'provider_evidence',
      });
    }

    res.json({ success: true, evidence });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/verification/pending
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const pending = await Evidence.find({ status: 'pending' })
      .populate('traineeId', 'name district phone')
      .sort({ uploadedAt: -1 });
    res.json(pending);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
