// backend/routes/moodLogs.js
//
// Mood log CRUD. Mounted at /api/mood-logs.

const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Score mapping -- single source of truth. Frontend also has this for
// optimistic display, but the DB is authoritative.
const MOOD_SCORES = {
  Calm: 5,
  Active: 4,
  Steady: 3,
  Tired: 2,
  Anxious: 2,
  Sad: 1,
};

// POST /api/mood-logs
// Body: { mood: string, note?: string, source?: string, context?: object }
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mood, note, source = 'manual', context = {} } = req.body || {};

    if (!mood || !MOOD_SCORES[mood]) {
      return res.status(400).json({
        error: `mood must be one of: ${Object.keys(MOOD_SCORES).join(', ')}`,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('mood_logs')
      .insert({
        user_id: userId,
        mood,
        mood_score: MOOD_SCORES[mood],
        note: note || null,
        source,
        context,
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({ data });
  } catch (error) {
    console.error('POST /api/mood-logs failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to log mood.' });
  }
});

// GET /api/mood-logs?days=30&limit=100
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('mood_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return res.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/mood-logs failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch mood logs.' });
  }
});

// GET /api/mood-logs/summary?days=30
// Returns: { daily: [{ date, avgScore, count, topMood }], overallAvg, byMood: {...}, streak }
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('mood_logs')
      .select('mood, mood_score, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', since)
      .order('logged_at', { ascending: true });

    if (error) throw error;

    const logs = data || [];

    // Group by date
    const byDate = {};
    for (const log of logs) {
      const date = log.logged_at.slice(0, 10);
      if (!byDate[date]) {
        byDate[date] = { scores: [], moods: [] };
      }
      byDate[date].scores.push(log.mood_score);
      byDate[date].moods.push(log.mood);
    }

    const daily = Object.entries(byDate)
      .map(([date, { scores, moods }]) => {
        const avgScore =
          scores.reduce((a, b) => a + b, 0) / scores.length;
        // Most frequent mood that day
        const freq = {};
        for (const m of moods) freq[m] = (freq[m] || 0) + 1;
        const topMood = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
        return {
          date,
          avgScore: Math.round(avgScore * 100) / 100,
          count: scores.length,
          topMood,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const overallAvg =
      logs.length > 0
        ? Math.round(
            (logs.reduce((s, l) => s + l.mood_score, 0) / logs.length) * 100
          ) / 100
        : null;

    const byMood = {};
    for (const log of logs) {
      byMood[log.mood] = (byMood[log.mood] || 0) + 1;
    }

    return res.json({
      data: {
        daily,
        overallAvg,
        byMood,
        totalLogs: logs.length,
      },
    });
  } catch (error) {
    console.error('GET /api/mood-logs/summary failed:', error);
    return res.status(500).json({ error: error.message || 'Failed.' });
  }
});

// DELETE /api/mood-logs/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('mood_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Mood log not found.' });

    return res.json({ data: { id } });
  } catch (error) {
    console.error('DELETE /api/mood-logs failed:', error);
    return res.status(500).json({ error: error.message || 'Failed.' });
  }
});

module.exports = router;