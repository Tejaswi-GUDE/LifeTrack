const express = require('express');
const router = express.Router();
const { Trainee, JobSkillReference } = require('../models');

// GET /api/intelligence/trainee/:id/job-matches
router.get('/trainee/:id/job-matches', async (req, res, next) => {
  try {
    const trainee = await Trainee.findById(req.params.id);
    if (!trainee) return res.status(404).json({ error: 'Trainee not found' });

    const jobs = await JobSkillReference.find({ status: 'active' });
    const matches = jobs.map((job) => {
      const matched = trainee.skills.filter((s) => job.skillTags.includes(s)).length;
      const gaps = job.skillTags.filter((s) => !trainee.skills.includes(s));
      return {
        jobId: job._id,
        jobTitle: job.jobTitle,
        matchScore: Math.round((matched / job.skillTags.length) * 100) || 0,
        matchedSkills: trainee.skills.filter((s) => job.skillTags.includes(s)),
        gapSkills: gaps,
        avgSalary: job.avgSalary,
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json(matches);
  } catch (err) {
    next(err);
  }
});

// GET /api/intelligence/market/insights
router.get('/market/insights', async (req, res, next) => {
  try {
    const { district, skillTags } = req.query;
    const jobs = await JobSkillReference.find({
      district: district || { $exists: true },
      skillTags: skillTags ? { $in: skillTags.split(',') } : { $exists: true },
    }).lean();

    const salaries = jobs.map((j) => j.avgSalary).filter(Boolean).sort((a, b) => a - b);
    const employers = [...new Set(jobs.map((j) => j.employerName))].slice(0, 10);

    res.json({
      jobCount: jobs.length,
      avgSalary: salaries.length > 0 ? Math.round(salaries[salaries.length / 2]) : null,
      topEmployers: employers,
      topSkills: [...new Set(jobs.flatMap((j) => j.skillTags))].slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
