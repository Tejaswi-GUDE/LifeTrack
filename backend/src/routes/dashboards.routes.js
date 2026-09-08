const router = require('express').Router();
const { buildGovernmentDashboard } = require('../lib/governmentDashboard');
const { buildProviderDashboard } = require('../lib/providerDashboard');
const { buildEmployerDashboard } = require('../lib/employerDashboard');

const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : null);

// GET /api/dashboards/government?state=&district=&verifiedOnly=
router.get('/government', async (req, res, next) => {
  try {
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

// GET /api/dashboards/provider/:providerId?courseId=
router.get('/provider/:providerId', async (req, res, next) => {
  try {
    res.json(await buildProviderDashboard(req.params.providerId, { courseId: norm(req.query.courseId) }));
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboards/employer?employer=<name>
router.get('/employer', async (req, res, next) => {
  try {
    res.json(await buildEmployerDashboard(norm(req.query.employer)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
