const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const router = express.Router();
router.get('/categories', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('exercise_categories').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});
router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('exercise_library').select('*, exercise_steps(*)').eq('is_active', true).order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});
module.exports = router;
