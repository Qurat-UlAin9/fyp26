const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const rewards = require('../services/rewards/rewardsService');

router.use(requireAuth);

const wrap = (fn) => async (req, res) => {
  try {
    const out = await fn(req);
    return res.json({ data: out });
  } catch (error) {
    console.error(`${req.method} ${req.originalUrl} failed:`, error.message || error);
    return res.status(500).json({ error: error.message || 'Rewards request failed.' });
  }
};

// GET /api/rewards -> { state, created }
router.get('/', wrap((req) => rewards.getState(req.user.id)));

// POST /api/rewards/import  (one-time copy of the phone's old local rewards)
router.post('/import', wrap((req) => rewards.importLocal(req.user.id, req.body || {})));

// POST /api/rewards/event  { kind: task|subtask|habit|game|focus, undo?, amount?, minutes? }
router.post('/event', wrap((req) => rewards.applyEvent(req.user.id, req.body || {})));

// POST /api/rewards/unlock  { kind: theme|sound, id }
router.post('/unlock', wrap((req) => rewards.unlock(req.user.id, req.body?.kind === 'theme' ? 'theme' : 'sound', req.body?.id)));

// POST /api/rewards/select  { kind, id }
router.post('/select', wrap((req) => rewards.select(req.user.id, req.body?.kind === 'theme' ? 'theme' : 'sound', req.body?.id)));

// POST /api/rewards/featured  { badgeId | null }
router.post('/featured', wrap((req) => rewards.setFeatured(req.user.id, req.body?.badgeId || null)));

// POST /api/rewards/celebrated  { ids: [] }
router.post('/celebrated', wrap((req) => rewards.markCelebrated(req.user.id, req.body?.ids)));

module.exports = router;
