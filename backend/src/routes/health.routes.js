const router = require('express').Router();
const mongoose = require('mongoose');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    now: new Date().toISOString(),
  });
});

module.exports = router;
