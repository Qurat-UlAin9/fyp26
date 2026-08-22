const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

function createUserCrudRouter({ table, allowedInsert = [], allowedUpdate = [], defaultOrder = 'created_at' }) {
  const router = express.Router();
  router.use(requireAuth);

  const pick = (body, allowed) => Object.fromEntries(allowed.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));

  router.get('/', async (req, res) => {
    let query = supabaseAdmin.from(table).select('*').eq('user_id', req.user.id);
    if (defaultOrder) query = query.order(defaultOrder, { ascending: false });
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ data });
  });

  router.get('/:id', async (req, res) => {
    const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
    return res.json({ data });
  });

  router.post('/', async (req, res) => {
    const payload = { ...pick(req.body || {}, allowedInsert), user_id: req.user.id };
    const { data, error } = await supabaseAdmin.from(table).insert(payload).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data });
  });

  router.patch('/:id', async (req, res) => {
    const payload = pick(req.body || {}, allowedUpdate);
    const { data, error } = await supabaseAdmin.from(table).update(payload).eq('id', req.params.id).eq('user_id', req.user.id).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  });

  router.delete('/:id', async (req, res) => {
    const { error } = await supabaseAdmin.from(table).delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(204).send();
  });

  return router;
}

module.exports = { createUserCrudRouter };
