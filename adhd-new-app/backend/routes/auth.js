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
  const { email, username, password } = req.body || {};
  if (!(email || username) || !password) return res.status(400).json({ error: 'email/username and password are required' });
  let loginEmail = email;
  if (username && !String(username).includes('@')) {
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('email').eq('username', username).maybeSingle();
    if (profileError || !profile?.email) return res.status(401).json({ error: 'Invalid email/username or password' });
    loginEmail = profile.email;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
  if (error) return res.status(401).json({ error: error.message });
  return res.json({ user: data.user, session: data.session });
});

router.get('/me', requireAuth, async (req, res) => res.json({ user: req.user }));

module.exports = router;
