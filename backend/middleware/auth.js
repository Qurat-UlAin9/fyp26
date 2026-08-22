const { supabase } = require('../config/supabase');

// Send Supabase Auth access tokens from the frontend as:
// Authorization: Bearer <access_token>
async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization bearer token' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired Supabase token' });

  req.user = data.user;
  return next();
}

module.exports = { requireAuth };
