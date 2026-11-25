// backend/routes/reframe.js  (mounted at /api/reframe)
//
//   POST /api/reframe        { thought, situation?, feedback?, previous? }  -> { data: { id, result } }
//   GET  /api/reframe        -> { data: [ { id, thought, result, created_at } ] }   (latest 20)
//   DELETE /api/reframe/:id
//
// Records are kept in the thought_records table (backend/scripts/create_thought_records.sql). If the
// table has not been created yet, reframing still works; it just is not saved.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');
const { analyzeMessage, getCrisisReply } = require('../services/ai/perception');
const { reframeThought } = require('../services/ai/reframe');

router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { thought, situation, feedback, previous } = req.body || {};

    if (!thought || typeof thought !== 'string' || !thought.trim()) {
      return res.status(400).json({ error: 'thought (string) is required.' });
    }

    // Same safety layer as the coach: too long, or a crisis, never reaches the model
    const perception = analyzeMessage(thought);
    if (!perception.ok && perception.reason === 'too_long') {
      return res.status(400).json({ error: perception.reply });
    }
    if (perception.crisis) {
      return res.json({ data: { crisis: true, reply: perception.reply } });
    }

    const result = await reframeThought({
      thought: thought.trim(),
      situation: typeof situation === 'string' ? situation : '',
      feedback: typeof feedback === 'string' ? feedback : '',
      previous: previous && typeof previous === 'object' ? previous : null,
    });

    if (result.crisis) {
      return res.json({ data: { crisis: true, reply: getCrisisReply() } });
    }

    let id = null;
    const { data: row, error } = await supabaseAdmin
      .from('thought_records')
      .insert({ user_id: userId, thought: thought.trim(), situation: situation || null, result })
      .select('id')
      .single();
    if (error) console.warn('[reframe] not saved (is thought_records created?):', error.message);
    else id = row.id;

    return res.json({ data: { id, result } });
  } catch (error) {
    console.error('POST /api/reframe failed:', error);
    if (error?.status === 429 || error?.status === 503) {
      return res.status(429).json({ error: 'The reframing tool is busy for a moment. Please try again in about 30 seconds.' });
    }
    return res.status(500).json({ error: error.message || 'Reframing failed.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('thought_records')
      .select('id, thought, situation, result, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.warn('[reframe] history unavailable:', error.message);
      return res.json({ data: [] });
    }
    return res.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/reframe failed:', error);
    return res.status(500).json({ error: 'Failed to load history.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('thought_records')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data: { deleted: true } });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete.' });
  }
});

module.exports = router;
