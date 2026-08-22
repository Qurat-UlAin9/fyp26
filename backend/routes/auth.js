const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Uses Supabase Auth. Enable email/password in Supabase Dashboard > Authentication > Providers.
router.post('/register', async (req, res) => {
  const { email, password, full_name, username } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name, username } } });
  if (error) return res.status(400).json({ error: error.message });

  if (data.user) {
    await supabaseAdmin.from('profiles').upsert({ user_id: data.user.id, email, full_name, username }, { onConflict: 'user_id' });
  }
  return res.status(201).json({ user: data.user, session: data.session });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  return res.json({ user: data.user, session: data.session });
});

router.get('/me', requireAuth, async (req, res) => res.json({ user: req.user }));

module.exports = router;
