const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { scoreAll, ALL_ITEMS, EFValidationError } = require('../scoring/executiveFunctionScoring');

const router = express.Router();
router.use(requireAuth);

// POST /api/executive-function
// body: { responses: { EF1: 3, EF2: 5, ... } }  (only the 30 items ALL_ITEMS needs)
router.post('/', async (req, res) => {
  const responses = req.body?.responses;

  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) {
    return res.status(400).json({
      error: `responses must be an object mapping item name to 1-5, e.g. { "EF1": 3, ... }. Required items: ${ALL_ITEMS.join(', ')}`,
    });
  }

  let result;
  try {
    result = scoreAll(responses);
  } catch (err) {
    if (err instanceof EFValidationError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from('ef_assessments')
    .insert({
      user_id: req.user.id,
      responses,
      dimension_scores: result.dimensions, // jsonb column: full breakdown per dimension
    })
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({ ...data });
});

// GET /api/executive-function
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('ef_assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});

module.exports = router;
