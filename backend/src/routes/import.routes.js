const express = require('express');
const router = express.Router();
const { Trainee, Course, Provider } = require('../models');

/**
 * POST /api/import/csv
 * { csv: string, providerId, courseId, dedupeBy: ['phone'|'email'|'name'] }
 * Parses CSV (name, contact, status) and dedups using phone/email/name.
 * Returns: { created: [], matched: [], errors: [] }
 */
router.post('/csv', async (req, res, next) => {
  try {
    const { csv, providerId, courseId, dedupeBy = ['contact'] } = req.body;
    if (!csv || !providerId || !courseId) {
      const e = new Error('csv, providerId, courseId required');
      e.status = 400;
      throw e;
    }

    const lines = csv.trim().split('\n').slice(1); // skip header
    const created = [];
    const matched = [];
    const errors = [];

    for (const line of lines) {
      try {
        const [name, contact, district, status] = line.split(',').map((s) => s.trim());
        if (!name || !contact) {
          errors.push({ line, reason: 'missing name or contact' });
          continue;
        }

        // Dedupe query — check if trainee already exists
        let existing = null;
        if (dedupeBy.includes('contact')) {
          existing = await Trainee.findOne({ contact, providerId });
        }
        if (!existing && dedupeBy.includes('name')) {
          existing = await Trainee.findOne({ name, providerId });
        }

        if (existing) {
          matched.push({
            id: String(existing._id),
            name: existing.name,
            contact: existing.contact,
          });
          continue;
        }

        // Create new trainee
        const trainee = new Trainee({
          name,
          contact,
          district: district || 'Unknown',
          courseId,
          providerId,
          batchId: `batch_${Date.now()}`,
        });
        await trainee.save();
        created.push({
          id: String(trainee._id),
          name: trainee.name,
          contact: trainee.contact,
        });
      } catch (lineErr) {
        errors.push({ line, reason: lineErr.message });
      }
    }

    res.json({ created, matched, errors, summary: { created: created.length, matched: matched.length, errors: errors.length } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
