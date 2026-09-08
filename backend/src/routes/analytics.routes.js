const router = require('express').Router();
const { buildOutcomeAnalytics } = require('../lib/outcomeAnalytics');

const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : null);

// GET /api/analytics/outcomes?district=&courseId=&providerId=&gender=&ageBand=
router.get('/outcomes', async (req, res, next) => {
  try {
    res.json(
      await buildOutcomeAnalytics({
        district: norm(req.query.district),
        courseId: norm(req.query.courseId),
        providerId: norm(req.query.providerId),
        gender: norm(req.query.gender),
        ageBand: norm(req.query.ageBand),
      }),
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
