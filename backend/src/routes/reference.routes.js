const router = require('express').Router();
const { Provider, Course, EmploymentPeriod, Verification, Trainee } = require('../models');

// GET /api/providers — id/name/district list (for the provider scope switcher).
// Ordered by aggregate outcome risk (highest first) so the scope switcher opens
// on the provider with the most trainees needing attention — the natural demo
// entry point, and the one the Government alert / Risk Center already point to.
router.get('/providers', async (req, res, next) => {
  try {
    const [rows, trainees] = await Promise.all([
      Provider.find().lean(),
      Trainee.find({}, { providerId: 1, 'outcomeRisk.score': 1 }).lean(),
    ]);
    const riskByProvider = new Map();
    for (const t of trainees) {
      const key = String(t.providerId);
      riskByProvider.set(key, (riskByProvider.get(key) || 0) + ((t.outcomeRisk && t.outcomeRisk.score) || 0));
    }
    const providers = rows
      .map((p) => ({ id: String(p._id), name: p.name, district: p.district }))
      .sort((a, b) => (riskByProvider.get(b.id) || 0) - (riskByProvider.get(a.id) || 0) || a.name.localeCompare(b.name));
    res.json({ providers });
  } catch (err) {
    next(err);
  }
});

// GET /api/courses — id/name/provider/skillTags list
router.get('/courses', async (req, res, next) => {
  try {
    const [courses, providers] = await Promise.all([Course.find().sort({ name: 1 }).lean(), Provider.find().lean()]);
    const pmap = new Map(providers.map((p) => [String(p._id), p]));
    res.json({
      courses: courses.map((c) => ({
        id: String(c._id),
        name: c.name,
        providerId: String(c.providerId),
        provider: (pmap.get(String(c.providerId)) || {}).name || null,
        skillTags: c.skillTags || [],
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/employers — distinct employer names seen in employment / verification
router.get('/employers', async (req, res, next) => {
  try {
    const [periods, vers] = await Promise.all([
      EmploymentPeriod.find().lean(),
      Verification.find().lean(),
    ]);
    const map = new Map(); // name -> { name, employees:Set, pending:0 }
    for (const p of periods) {
      if (!map.has(p.employerName)) map.set(p.employerName, { name: p.employerName, employees: new Set(), pending: 0, kinds: new Set() });
      map.get(p.employerName).employees.add(String(p.traineeId));
      map.get(p.employerName).kinds.add(p.kind);
    }
    for (const v of vers) {
      if (!map.has(v.employerName)) map.set(v.employerName, { name: v.employerName, employees: new Set(), pending: 0, kinds: new Set() });
      if (v.status === 'pending') map.get(v.employerName).pending += 1;
    }
    const employers = [...map.values()]
      // real employers only (exclude self-employment "own business" rows)
      .filter((e) => !e.kinds.has('self_employment') || e.employees.size > 0)
      .map((e) => ({ name: e.name, employeeCount: e.employees.size, pendingVerifications: e.pending }))
      .sort((a, b) => b.pendingVerifications - a.pendingVerifications || b.employeeCount - a.employeeCount || a.name.localeCompare(b.name));
    res.json({ employers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
