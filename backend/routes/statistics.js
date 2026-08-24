const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('user_statistics')
    .select('*')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ data });
});

router.get('/:period', async (req, res) => {
  const { period } = req.params;

  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return res.status(400).json({
      error: 'Invalid period. Use daily, weekly, or monthly.',
    });
  }

  const table = `${period}_statistics`;

  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('user_id', req.user.id)
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ data });
});

module.exports = router;

