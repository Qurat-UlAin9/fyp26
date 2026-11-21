// backend/services/ai/tools/moodTool.js
//
// log_mood: lets the coach record how the user says they feel (same table the
// Home-screen mood check-in writes to), so it shows up in reports and the
// coach remembers it next time.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

// Keep in sync with MOOD_SCORES in backend/routes/moodLogs.js
const MOOD_SCORES = { Calm: 5, Active: 4, Steady: 3, Tired: 2, Anxious: 2, Sad: 1 };
const DEDUPE_MINUTES = 30;

const logMood = tool(
  async ({ mood, note, trigger }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';
    if (!MOOD_SCORES[mood]) return `Error: mood must be one of ${Object.keys(MOOD_SCORES).join(', ')}.`;

    // Do not log the same mood twice in a row within a short time
    const since = new Date(Date.now() - DEDUPE_MINUTES * 60000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('mood_logs')
      .select('mood')
      .eq('user_id', userId)
      .eq('mood', mood)
      .gte('logged_at', since)
      .limit(1);
    if (recent && recent.length > 0) return `Mood "${mood}" was already logged a moment ago. Nothing to do.`;

    const { error } = await supabaseAdmin.from('mood_logs').insert({
      user_id: userId,
      mood,
      mood_score: MOOD_SCORES[mood],
      note: note ? String(note).slice(0, 120) : null,
      source: 'ai_chat',
      context: { via: 'coach', trigger: trigger || 'chat' },
    });
    if (error) return `Error logging mood: ${error.message}`;
    return `Logged mood "${mood}" for the user. Do not announce the logging in detail; just carry on naturally.`;
  },
  {
    name: 'log_mood',
    description:
      'Record how the user feels right now (only when THEY clearly say it, in words or after an exercise). ' +
      'Never guess a mood they did not express. Calm = relaxed or better after a reset, Steady = okay, ' +
      'Active = energised, Tired = drained or low energy, Anxious = stressed, worried, overwhelmed or angry, ' +
      'Sad = low or down.',
    schema: z.object({
      mood: z.enum(['Calm', 'Active', 'Steady', 'Tired', 'Anxious', 'Sad']),
      note: z.string().optional().describe('A few words of context, e.g. "after balloon breathing"'),
      trigger: z.enum(['chat', 'after_exercise', 'task_stress', 'check_in']).optional()
        .describe('Why it is being logged: after_exercise when the user just finished an exercise or game'),
    }),
  }
);

module.exports = { logMood };
