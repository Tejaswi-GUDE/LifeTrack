const router = require('express').Router();
const { buildTraineeProfile, buildTraineeList } = require('../lib/traineeProfile');
const { buildTraineeRisk } = require('../lib/riskCenter');

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
