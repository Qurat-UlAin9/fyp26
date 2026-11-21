// backend/services/ai/tools/habitCheckTool.js
//
// complete_habit: ticks one time-slot of a habit as done today, exactly the way
// the Habits screen does (metadata.completions[] + streak when all slots are done).

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');
const { pushAppAction } = require('./appActions');
const rewards = require('../../rewards/rewardsService');

const todayISO = () => new Date().toISOString().slice(0, 10);
const yesterdayISO = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const completeHabit = tool(
  async ({ habit_id, habit_title, time_slot }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data: habits, error } = await supabaseAdmin
      .from('habits')
      .select('id, title, metadata')
      .eq('user_id', userId)
      .eq('active', true);
    if (error) return `Error loading habits: ${error.message}`;
    if (!habits || habits.length === 0) return 'The user has no active habits.';

    let habit = habit_id ? habits.find((h) => h.id === habit_id) : null;
    if (!habit && habit_title) {
      const q = String(habit_title).toLowerCase();
      const matches = habits.filter((h) => String(h.title).toLowerCase().includes(q));
      if (matches.length === 1) habit = matches[0];
      else if (matches.length > 1) {
        return `Several habits match: ${matches.map((h) => `"${h.title}" (id: ${h.id})`).join(', ')}. Ask the user which one.`;
      }
    }
    if (!habit) return 'Habit not found. Use the habit list to get the right habit_id.';

    const meta = { ...(habit.metadata || {}) };
    const slots = Array.isArray(meta.timeSlots) && meta.timeSlots.length ? meta.timeSlots : ['Morning'];
    const today = todayISO();

    // Ticks from a previous day are stale until the Habits screen resets them
    const fresh = meta.lastCompletionDate === today || meta.completionsDate === today;
    const completions = slots.map((_, i) => (fresh ? Boolean(meta.completions?.[i]) : false));

    let idx = -1;
    if (time_slot) idx = slots.findIndex((s) => s.toLowerCase() === String(time_slot).toLowerCase());
    if (idx < 0) idx = completions.findIndex((c) => !c);
    if (idx < 0) return `"${habit.title}" is already fully done for today.`;
    if (completions[idx]) return `"${habit.title}" (${slots[idx]}) was already done today.`;

    completions[idx] = true;
    meta.completions = completions;
    meta.completionsDate = today;

    let streakNote = '';
    if (completions.every(Boolean)) {
      const prev = meta.streak || 0;
      meta.streak = meta.lastCompletionDate === yesterdayISO() ? prev + 1 : 1;
      meta.lastCompletionDate = today;
      streakNote = ` That completes it for today. Streak: ${meta.streak} day${meta.streak > 1 ? 's' : ''}.`;
    }

    const { error: upErr } = await supabaseAdmin
      .from('habits')
      .update({ metadata: meta })
      .eq('id', habit.id)
      .eq('user_id', userId);
    if (upErr) return `Error updating habit: ${upErr.message}`;

    // Award the same coins a manual tick gives (saved on the server), and tell the app to refresh
    let coinNote = '';
    try {
      const r = await rewards.applyEvent(userId, { kind: 'habit' });
      if (r.delta > 0) {
        pushAppAction(config, { type: 'rewards_changed', earned: r.delta });
        coinNote = ` The user earned ${r.delta} coins for it.`;
      }
    } catch (e) {
      console.warn('[rewards] habit coins failed:', e.message);
    }

    const left = completions.filter((c) => !c).length;
    return `Ticked "${habit.title}" (${slots[idx]}) as done today.${streakNote}${coinNote}${left ? ` ${left} slot(s) left today.` : ''}`;
  },
  {
    name: 'complete_habit',
    description:
      'Mark a habit as done for today when the user says they did it (e.g. "I did my walk"). ' +
      'If they name a time of day use time_slot; otherwise the next open slot is ticked. ' +
      'Only after the user says they did it, never on a guess.',
    schema: z.object({
      habit_id: z.string().optional(),
      habit_title: z.string().optional().describe('Part of the habit name, if you do not have the id'),
      time_slot: z.enum(['Morning', 'Noon', 'Evening', 'Night']).optional(),
    }),
  }
);

module.exports = { completeHabit };
