const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const answers = req.body?.answers;

  if (!Array.isArray(answers) || answers.length !== 18) {
    return res.status(400).json({ error: 'answers must be an array of 18 values' });
  }

  const parsedAnswers = answers.map((answer) => Number(answer));
  if (parsedAnswers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 4)) {
    return res.status(400).json({ error: 'each answer must be an integer from 0 to 4' });
  }

  let predictionResponse;
  try {
    const predictionRequest = await fetch(`${process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001'}/detection/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: parsedAnswers, user_id: req.user.id }),
    });

    predictionResponse = await predictionRequest.json();
    if (!predictionRequest.ok) {
      return res.status(502).json({ error: predictionResponse.error || 'ML prediction service failed' });
    }
  } catch (error) {
    return res.status(503).json({
      error: 'Cannot connect to the ML prediction service. Start backend/app.py on port 5001.',
    });
  }

  const { data, error } = await supabaseAdmin
    .from('assessments')
    .insert({
      user_id: req.user.id,
      answers: parsedAnswers,
      score: predictionResponse.score,
      max_score: predictionResponse.max_score,
      percentage: predictionResponse.percentage,
      predicted_label: predictionResponse.predicted_label,
      adhd_probability: predictionResponse.adhd_probability,
      top_factors: predictionResponse.top_factors || [],
    })
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({
    ...data,
  });
});

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
});

module.exports = router;