const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { profileFields, adhdProfileFields, preferenceFields } = require('../models/schemas');
const router = express.Router();
router.use(requireAuth);
const pick = (body, fields) => Object.fromEntries(fields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
async function upsertSingle(table, req, res, fields) {
  const payload = { ...pick(req.body || {}, fields), user_id: req.user.id };
  const { data, error } = await supabaseAdmin.from(table).upsert(payload, { onConflict: 'user_id' }).select('*').single();
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
}
async function getSingle(table, req, res) {
  const { data, error } = await supabaseAdmin.from(table).select('*').eq('user_id', req.user.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}
router.get('/', (req, res) => getSingle('profiles', req, res));
router.put('/', (req, res) => upsertSingle('profiles', req, res, profileFields));
router.get('/adhd', (req, res) => getSingle('adhd_profile', req, res));
router.put('/adhd', (req, res) => upsertSingle('adhd_profile', req, res, adhdProfileFields));
router.get('/preferences', (req, res) => getSingle('user_preferences', req, res));
router.put('/preferences', (req, res) => upsertSingle('user_preferences', req, res, preferenceFields));
module.exports = router;
