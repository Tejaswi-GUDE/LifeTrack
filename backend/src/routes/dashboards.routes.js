const router = require('express').Router();
const { buildGovernmentDashboard } = require('../lib/governmentDashboard');

// GET /api/dashboards/government?state=&district=&verifiedOnly=
// Aggregated, de-identified outcome intelligence for the Government role
// (PRD §20 — no trainee-level identified data in this response).
router.get('/government', async (req, res, next) => {
  try {
    const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : null);
    const data = await buildGovernmentDashboard({
      state: norm(req.query.state),
      district: norm(req.query.district),
      verifiedOnly: req.query.verifiedOnly === 'true' || req.query.verifiedOnly === '1',
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
