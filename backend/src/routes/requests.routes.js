const router = require('express').Router();
const mongoose = require('mongoose');
const { SupportRequest, Trainee, Course, User } = require('../models');
const { counsellorForCourse, publicCounsellor } = require('../lib/counsellors');
const { REQUEST_CATEGORY_LABELS, REQUEST_STATUS_LABELS, label } = require('../lib/labels');

const norm = (v) => (v && v !== 'all' && v !== '' ? String(v) : null);
const CATEGORIES = Object.keys(REQUEST_CATEGORY_LABELS);

async function shape(sr, { trainee, course, counsellor } = {}) {
  const t = trainee || (await Trainee.findById(sr.traineeId).lean());
  const c = course || (sr.courseId ? await Course.findById(sr.courseId).lean() : null);
  const cn = counsellor
    || (sr.assignedCounsellorId ? await User.findById(sr.assignedCounsellorId).lean() : null);
  const msgs = (sr.messages || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at));
  return {
    id: String(sr._id),
    traineeId: String(sr.traineeId),
    traineeName: t ? t.name : '—',
    course: c ? c.name : null,
    courseId: sr.courseId ? String(sr.courseId) : null,
    providerId: sr.providerId ? String(sr.providerId) : null,
    toRole: sr.toRole,
    counsellor: cn ? publicCounsellor(cn) : null,
    category: sr.category,
    categoryLabel: label(REQUEST_CATEGORY_LABELS, sr.category),
    subject: sr.subject,
    status: sr.status,
    statusLabel: label(REQUEST_STATUS_LABELS, sr.status),
    messages: msgs,
    lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
    messageCount: msgs.length,
    createdAt: sr.createdAt,
    updatedAt: sr.updatedAt,
  };
}

// GET /api/requests?traineeId=&counsellorId=&providerId=&toRole=&status=
router.get('/', async (req, res, next) => {
  try {
    const traineeId = norm(req.query.traineeId);
    const counsellorId = norm(req.query.counsellorId);
    const providerId = norm(req.query.providerId);
    const toRole = norm(req.query.toRole);
    const status = norm(req.query.status);

    const q = {};
    if (traineeId && mongoose.isValidObjectId(traineeId)) q.traineeId = traineeId;
    if (counsellorId && mongoose.isValidObjectId(counsellorId)) q.assignedCounsellorId = counsellorId;
    if (providerId && mongoose.isValidObjectId(providerId)) q.providerId = providerId;
    if (toRole) q.toRole = toRole;
    if (status) q.status = status;

    const rows = await SupportRequest.find(q).sort({ updatedAt: -1 }).lean();
    const [trainees, courses, counsellors] = await Promise.all([
      Trainee.find({ _id: { $in: rows.map((r) => r.traineeId) } }).lean(),
      Course.find().lean(),
      User.find({ role: 'counsellor' }).lean(),
    ]);
    const tmap = new Map(trainees.map((t) => [String(t._id), t]));
    const cmap = new Map(courses.map((c) => [String(c._id), c]));
    const nmap = new Map(counsellors.map((u) => [String(u._id), u]));

    const requests = await Promise.all(
      rows.map((sr) => shape(sr, {
        trainee: tmap.get(String(sr.traineeId)),
        course: sr.courseId ? cmap.get(String(sr.courseId)) : null,
        counsellor: sr.assignedCounsellorId ? nmap.get(String(sr.assignedCounsellorId)) : null,
      })),
    );
    const counts = requests.reduce((acc, x) => ((acc[x.status] = (acc[x.status] || 0) + 1), acc), {});
    res.json({ count: requests.length, counts, requests });
  } catch (err) {
    next(err);
  }
});

// GET /api/requests/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) { const e = new Error('Request not found'); e.status = 404; throw e; }
    const sr = await SupportRequest.findById(req.params.id).lean();
    if (!sr) { const e = new Error('Request not found'); e.status = 404; throw e; }
    res.json({ request: await shape(sr) });
  } catch (err) {
    next(err);
  }
});

// POST /api/requests  { traineeId, toRole, category, subject, message }
router.post('/', async (req, res, next) => {
  try {
    const { traineeId, toRole = 'counsellor', category = 'counselling', subject, message } = req.body || {};
    if (!mongoose.isValidObjectId(traineeId)) { const e = new Error('A valid traineeId is required'); e.status = 400; throw e; }
    if (!['provider', 'counsellor'].includes(toRole)) { const e = new Error('toRole must be provider or counsellor'); e.status = 400; throw e; }
    if (!CATEGORIES.includes(category)) { const e = new Error('Unknown category'); e.status = 400; throw e; }
    if (!subject || !String(subject).trim()) { const e = new Error('A subject is required'); e.status = 400; throw e; }
    if (!message || !String(message).trim()) { const e = new Error('A message is required'); e.status = 400; throw e; }

    const trainee = await Trainee.findById(traineeId).lean();
    if (!trainee) { const e = new Error('Trainee not found'); e.status = 404; throw e; }

    const counsellor = toRole === 'counsellor' ? await counsellorForCourse(trainee.courseId) : null;

    const sr = await SupportRequest.create({
      traineeId: trainee._id,
      courseId: trainee.courseId || null,
      providerId: trainee.providerId || null,
      toRole,
      assignedCounsellorId: counsellor ? counsellor._id : null,
      category,
      subject: String(subject).trim().slice(0, 160),
      status: 'open',
      messages: [{
        fromRole: 'trainee', fromName: trainee.name, text: String(message).trim().slice(0, 2000), at: new Date(),
      }],
    });
    res.status(201).json({ request: await shape(sr.toObject(), { trainee, counsellor }) });
  } catch (err) {
    next(err);
  }
});

// POST /api/requests/:id/messages  { fromRole, fromName?, text }
router.post('/:id/messages', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) { const e = new Error('Request not found'); e.status = 404; throw e; }
    const sr = await SupportRequest.findById(req.params.id);
    if (!sr) { const e = new Error('Request not found'); e.status = 404; throw e; }
    const { fromRole, fromName, text } = req.body || {};
    if (!['trainee', 'provider', 'counsellor'].includes(fromRole)) { const e = new Error('fromRole must be trainee, provider or counsellor'); e.status = 400; throw e; }
    if (!text || !String(text).trim()) { const e = new Error('A message is required'); e.status = 400; throw e; }

    let name = fromName ? String(fromName).slice(0, 120) : null;
    if (!name) {
      if (fromRole === 'trainee') { const t = await Trainee.findById(sr.traineeId).lean(); name = t ? t.name : 'Trainee'; }
      else if (fromRole === 'counsellor' && sr.assignedCounsellorId) { const u = await User.findById(sr.assignedCounsellorId).lean(); name = u ? u.name : 'Counsellor'; }
      else name = fromRole === 'provider' ? 'Training provider' : 'Counsellor';
    }

    sr.messages.push({ fromRole, fromName: name, text: String(text).trim().slice(0, 2000), at: new Date() });
    if (sr.status === 'open' && fromRole !== 'trainee') sr.status = 'in_progress';
    sr.markModified('messages');
    await sr.save();
    res.status(201).json({ request: await shape(sr.toObject()) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/requests/:id  { status }
router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) { const e = new Error('Request not found'); e.status = 404; throw e; }
    const { status } = req.body || {};
    if (!['open', 'in_progress', 'resolved'].includes(status)) { const e = new Error('Invalid status'); e.status = 400; throw e; }
    const sr = await SupportRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!sr) { const e = new Error('Request not found'); e.status = 404; throw e; }
    res.json({ request: await shape(sr.toObject()) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
