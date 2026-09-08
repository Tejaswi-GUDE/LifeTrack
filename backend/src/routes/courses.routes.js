const router = require('express').Router();
const mongoose = require('mongoose');
const { Trainee, Course, Provider, SkillMatchResult, JobSkillReference } = require('../models');

const round1 = (n) => Math.round(n * 10) / 10;

async function courseSkillGaps({ providerId, courseId } = {}) {
  const courseQuery = {};
  if (providerId && mongoose.isValidObjectId(providerId)) courseQuery.providerId = providerId;
  if (courseId && mongoose.isValidObjectId(courseId)) courseQuery._id = courseId;

  const [courses, providers, jobRefs] = await Promise.all([
    Course.find(courseQuery).lean(),
    Provider.find().lean(),
    JobSkillReference.find().lean(),
  ]);
  const pmap = new Map(providers.map((p) => [String(p._id), p]));

  const bestOccupation = (skillTags) => {
    const taught = new Set((skillTags || []).map((s) => s.toLowerCase()));
    let best = null;
    let bs = -1;
    for (const j of jobRefs) {
      const o = (j.requiredSkills || []).filter((s) => taught.has(s.toLowerCase())).length;
      if (o > bs) { bs = o; best = j; }
    }
    return bs > 0 ? best : null;
  };

  const courseIds = courses.map((c) => c._id);
  const [trainees, sms] = await Promise.all([
    Trainee.find({ courseId: { $in: courseIds } }).lean(),
    SkillMatchResult.find().lean(),
  ]);
  const traineesByCourse = new Map();
  for (const t of trainees) {
    const k = String(t.courseId);
    if (!traineesByCourse.has(k)) traineesByCourse.set(k, []);
    traineesByCourse.get(k).push(t);
  }
  const smByTrainee = new Map();
  for (const s of sms) {
    const k = String(s.traineeId);
    if (!smByTrainee.has(k)) smByTrainee.set(k, []);
    smByTrainee.get(k).push(s);
  }

  const out = courses.map((c) => {
    const list = traineesByCourse.get(String(c._id)) || [];
    const missCount = new Map();
    const scores = [];
    for (const t of list) {
      const latest = (smByTrainee.get(String(t._id)) || [])
        .slice()
        .sort((a, b) => new Date(b.computedAt) - new Date(a.computedAt))[0];
      if (latest) {
        scores.push(latest.score);
        for (const m of latest.missingSkills || []) missCount.set(m, (missCount.get(m) || 0) + 1);
      }
    }
    const occ = bestOccupation(c.skillTags);
    const taughtLc = (c.skillTags || []).map((x) => x.toLowerCase());
    const structuralMissing = occ ? (occ.requiredSkills || []).filter((s) => !taughtLc.includes(s.toLowerCase())) : [];
    const missingSkills = [...new Set([...missCount.keys(), ...structuralMissing])]
      .map((skill) => ({
        skill,
        affectedTrainees: missCount.get(skill) || 0,
        structural: structuralMissing.includes(skill),
      }))
      .sort((a, b) => b.affectedTrainees - a.affectedTrainees || a.skill.localeCompare(b.skill));

    return {
      id: String(c._id),
      name: c.name,
      provider: (pmap.get(String(c.providerId)) || {}).name || null,
      taughtSkills: c.skillTags || [],
      targetOccupation: occ ? occ.occupationTitle : null,
      requiredSkills: occ ? occ.requiredSkills || [] : [],
      trainees: list.length,
      avgSkillMatch: scores.length ? round1(scores.reduce((s, x) => s + x, 0) / scores.length) : null,
      mismatchRate: scores.length ? round1((scores.filter((s) => s < 40).length / scores.length) * 100) : null,
      missingSkills,
    };
  });
  out.sort((a, b) => (b.missingSkills[0]?.affectedTrainees || 0) - (a.missingSkills[0]?.affectedTrainees || 0));
  return out;
}

// GET /api/courses/skill-gap?providerId=
router.get('/skill-gap', async (req, res, next) => {
  try {
    const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : null);
    const courses = await courseSkillGaps({ providerId: norm(req.query.providerId) });
    res.json({ generatedAt: new Date().toISOString(), courses });
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/:id/skill-gap
router.get('/:id/skill-gap', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const e = new Error('Course not found');
      e.status = 404;
      throw e;
    }
    const [row] = await courseSkillGaps({ courseId: req.params.id });
    if (!row) {
      const e = new Error('Course not found');
      e.status = 404;
      throw e;
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
