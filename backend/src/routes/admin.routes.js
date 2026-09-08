const router = require('express').Router();
const { runSeed } = require('../seed/runSeed');
const { AuditLog } = require('../models');

// POST /api/admin/seed/reset — wipe + reload the demo dataset (Build Spec §13)
router.post('/seed/reset', async (req, res, next) => {
  try {
    await runSeed();
    await AuditLog.create({
      entity: 'System',
      entityId: new (require('mongoose').Types.ObjectId)(),
      action: 'seed_reset',
      actorRole: (req.body && req.body.actorRole) || 'government',
    });
    res.json({ ok: true, resetAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
