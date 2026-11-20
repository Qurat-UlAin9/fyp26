// backend/services/ai/context/moodContext.js
//
// Lets the coach know how the user said they felt recently
// (mood check-ins from the Home screen are stored in mood_logs).

const { supabaseAdmin } = require('../../../config/supabase');

const LOOKBACK_HOURS = 72;

async function fetchRecentMoods(userId) {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('mood_logs')
    .select('mood, mood_score, note, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', since)
    .order('logged_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data || [];
}

function ago(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

function formatMoodBlock(rows) {
  if (!rows || rows.length === 0) {
    return '\nRECENT MOOD: the user has not logged a mood in the last 3 days.\n';
  }
  let block = '\nRECENT MOOD CHECK-INS (self-logged in the app, newest first):\n';
  rows.forEach((r) => {
    const note = r.note ? ` — note: "${String(r.note).slice(0, 80)}"` : '';
    block += `- ${r.mood} (${ago(r.logged_at)})${note}\n`;
  });
  block +=
    'MOOD RULES: Use this naturally, never quote scores or say "your data shows". ' +
    'If the latest mood is low, stressed, anxious or frustrated, check in gently BEFORE pushing tasks. ' +
    'If they tell you directly how they feel in chat, that beats the logged mood.\n';
  return block;
}

module.exports = { fetchRecentMoods, formatMoodBlock };