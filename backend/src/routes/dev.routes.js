const router = require('express').Router();
const { Trainee, FollowupSchedule, MockMessage } = require('../models');

// Simulated "today" for demo time control
let DEMO_TODAY = new Date('2026-09-08T00:00:00.000Z');

// GET /api/dev/clock — get current simulated date
router.get('/clock', (req, res) => {
  res.json({ today: DEMO_TODAY.toISOString() });
});

// POST /api/dev/clock — set simulated date
router.post('/clock', (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  DEMO_TODAY = new Date(date);
  res.json({ today: DEMO_TODAY.toISOString() });
});

// POST /api/dev/run-followups — run scheduler immediately and advance escalation ladder
router.post('/run-followups', async (req, res, next) => {
  try {
    const pending = await FollowupSchedule.find({ status: 'pending', scheduledDate: { $lte: DEMO_TODAY } });

    for (const sched of pending) {
      const trainee = await Trainee.findById(sched.traineeId);
      if (!trainee) continue;

      // Determine next step in escalation ladder
      const step = sched.currentStep || 0;
      const channels = ['whatsapp', 'sms', 'ivr', 'alternate_contact', 'agent', 'not_responding'];
      const nextChannel = channels[step];

      // Simulate outbound message
      const mockMsg = await MockMessage.create({
        traineeId: trainee._id,
        phone: trainee.contact,
        channel: nextChannel === 'alternate_contact' ? 'sms' : nextChannel,
        direction: 'outbound',
        body: `Hi ${trainee.name}, how are you doing? Please reply with your current job status.`,
        sentAt: DEMO_TODAY,
      });

      // Record attempt
      if (!sched.attempts) sched.attempts = [];
      sched.attempts.push({
        step,
        channel: nextChannel,
        attempted: true,
        successful: false,
      });

      await sched.save();
    }

    res.json({ processed: pending.length, today: DEMO_TODAY.toISOString() });
  } catch (err) {
    next(err);
  }
});

// GET /api/dev/phone — list trainees for mock phone (with current ladder state)
router.get('/phone', async (req, res, next) => {
  try {
    const trainees = await Trainee.find({ training: { $exists: true, certified: true } })
      .select('name contact district currentStatus')
      .limit(20)
      .lean();

    // Get ladder state for each
    const withLadder = await Promise.all(
      trainees.map(async (t) => {
        const sched = await FollowupSchedule.findOne({
          traineeId: t._id,
          status: 'pending',
        }).lean();
        return {
          ...t,
          id: String(t._id),
          currentStep: sched?.currentStep || 0,
          attempts: sched?.attempts || [],
        };
      })
    );

    res.json({ trainees: withLadder });
  } catch (err) {
    next(err);
  }
});

// GET /api/dev/messages/:traineeId — get mock messages for a trainee
router.get('/messages/:traineeId', async (req, res, next) => {
  try {
    const { traineeId } = req.params;
    const messages = await MockMessage.find({ traineeId })
      .sort({ sentAt: 1 })
      .limit(100)
      .lean();
    res.json({ messages, count: messages.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
