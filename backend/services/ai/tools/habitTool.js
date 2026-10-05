// backend/services/ai/tools/habitTool.js

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const VALID_SLOTS = ['Morning', 'Noon', 'Evening', 'Night'];
const VALID_COLORS = ['coral', 'blue', 'green', 'purple', 'teal'];

const DEFAULT_GRADIENTS = {
  coral: ['#FF9A8B', '#FF6A88'],
  blue: ['#5DAEFF', '#3A8DFF'],
  green: ['#6EE7B7', '#34D399'],
  purple: ['#A78BFA', '#7C3AED'],
  teal: ['#4FD1C5', '#2CB1BC'],
};

function pickGradient(color) {
  return DEFAULT_GRADIENTS[color] || DEFAULT_GRADIENTS.blue;
}

// Pick a color not already in use by this user's habits. If all 5 are
// used, cycle back to the least-recently-used.
async function pickUnusedColor(userId, preferredColor) {
  if (preferredColor && VALID_COLORS.includes(preferredColor)) {
    return preferredColor;
  }

  const { data } = await supabaseAdmin
    .from('habits')
    .select('color')
    .eq('user_id', userId)
    .eq('active', true);

  const used = new Set((data || []).map((h) => h.color).filter(Boolean));
  const available = VALID_COLORS.filter((c) => !used.has(c));

  if (available.length > 0) return available[0];

  // All used — return the one with the least recent created_at
  const { data: all } = await supabaseAdmin
    .from('habits')
    .select('color, created_at')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  return all?.[0]?.color || 'blue';
}

// ---------------------------------------------------------
// create_habit
// ---------------------------------------------------------
const createHabit = tool(
  async (
    {
      title,
      description,
      time_slots,
      color: requestedColor,
      frequency,
      goal_value,
      unit,
      target_days,
      reason,
    },
    config
  ) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return 'Error: title is required.';

    // Dedup check
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('habits')
      .select('id, title, metadata')
      .eq('user_id', userId)
      .eq('active', true)
      .ilike('title', cleanTitle);

    if (lookupError) return `Error checking existing habits: ${lookupError.message}`;

    if (existing && existing.length > 0) {
      const found = existing[0];
      const existingSlots = found.metadata?.timeSlots || [];
      return (
        `A habit named "${found.title}" already exists (id: ${found.id}, ` +
        `slots: ${existingSlots.join(', ') || 'none'}). Do NOT create a duplicate. ` +
        `If the user wants to change it, call update_habit with this id.`
      );
    }

    // Auto-pick color
    const finalColor = await pickUnusedColor(userId, requestedColor);

    // Slots
    const slots = Array.isArray(time_slots)
      ? time_slots.filter((s) => VALID_SLOTS.includes(s))
      : [];
    const finalSlots = slots.length > 0 ? slots : ['Morning'];

    const today = new Date().toISOString().slice(0, 10);
    const targetDays =
      typeof target_days === 'number' && target_days > 0 ? target_days : null;

    const metadata = {
      timeSlots: finalSlots,
      completions: new Array(finalSlots.length).fill(false),
      gradient: pickGradient(finalColor),
      streak: 0,
      lastCompletionDate: null,
      targetDays,
      startedAt: today,
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('habits')
      .insert({
        user_id: userId,
        title: cleanTitle,
        description: description || null,
        frequency: frequency || 'Daily',
        goal_value: goal_value || 1,
        unit: unit || 'times',
        active: true,
        created_by_ai: true,
        color: finalColor,
        metadata,
      })
      .select()
      .single();

    if (error) return `Error creating habit: ${error.message}`;

    const slotNote = finalSlots.length > 1 ? ` at ${finalSlots.join(' + ')}` : '';
    const durNote = targetDays ? ` for ${targetDays} days` : '';
    return (
      `Created habit "${data.title}"${slotNote}${durNote} ` +
      `(color: ${finalColor}).` +
      (reason ? ` Reason: ${reason}` : '')
    );
  },
  {
    name: 'create_habit',
    description:
      'Create a recurring habit for the user to track. Use for behaviors they want to build ' +
      'consistently (e.g. "drink more water", "journal every evening"), not one-off tasks. ' +
      'If the user names multiple times of day for the SAME habit, pass them all via ' +
      'time_slots -- do NOT create separate habits. If the user says "for 7 days" or ' +
      '"for a month", set target_days accordingly. Leave color unset unless the user asks ' +
      'for a specific one; the system picks a distinct color automatically. ' +
      'Refuses duplicates -- if it returns "already exists", call update_habit instead.',
    schema: z.object({
      title: z.string().describe('Short habit name, e.g. "Walk"'),
      description: z.string().optional(),
      time_slots: z
        .array(z.enum(['Morning', 'Noon', 'Evening', 'Night']))
        .optional()
        .describe('Times of day for the SAME habit. Use multiple values for morning + evening, etc.'),
      color: z.enum(VALID_COLORS).optional().describe('Only set if user asked for a specific color'),
      frequency: z.enum(['Daily', 'Weekly']).optional(),
      goal_value: z.number().optional(),
      unit: z.string().optional(),
      target_days: z
        .number()
        .optional()
        .describe(
          'How many days the user wants to commit to this habit. Set when the user says ' +
          '"for 7 days", "for 30 days", "for a month" etc. Omit for open-ended habits.'
        ),
      reason: z.string().optional(),
    }),
  }
);

// ---------------------------------------------------------
// update_habit (extended with target_days)
// ---------------------------------------------------------
const updateHabit = tool(
  async (
    {
      habit_id,
      title,
      description,
      time_slots,
      color,
      frequency,
      goal_value,
      unit,
      active,
      target_days,
      reason,
    },
    config
  ) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('habits')
      .select('*')
      .eq('id', habit_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) return `Error fetching habit: ${fetchError.message}`;
    if (!existing) return `Error: habit ${habit_id} not found for this user.`;

    const patch = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (frequency !== undefined) patch.frequency = frequency;
    if (goal_value !== undefined) patch.goal_value = goal_value;
    if (unit !== undefined) patch.unit = unit;
    if (active !== undefined) patch.active = active;
    if (color !== undefined) patch.color = color;

    const metadata = { ...(existing.metadata || {}) };

    if (color !== undefined) metadata.gradient = pickGradient(color);

    if (Array.isArray(time_slots)) {
      const slots = time_slots.filter((s) => VALID_SLOTS.includes(s));
      if (slots.length > 0) {
        const priorCompletions = Array.isArray(metadata.completions)
          ? metadata.completions
          : [];
        metadata.timeSlots = slots;
        metadata.completions = slots.map((slot) => {
          const oldIdx = (existing.metadata?.timeSlots || []).indexOf(slot);
          return oldIdx >= 0 ? Boolean(priorCompletions[oldIdx]) : false;
        });
      }
    }

    if (target_days !== undefined) {
      metadata.targetDays =
        typeof target_days === 'number' && target_days > 0 ? target_days : null;
    }

    if (Object.keys(metadata).length > 0) patch.metadata = metadata;

    const { data, error } = await supabaseAdmin
      .from('habits')
      .update(patch)
      .eq('id', habit_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return `Error updating habit: ${error.message}`;

    const changed = Object.keys(patch).filter((k) => k !== 'metadata');
    return `Updated habit "${data.title}".${reason ? ` ${reason}` : ''}`;
  },
  {
    name: 'update_habit',
    description:
      "Modify an existing habit's title, slots, color, frequency, goal, or target_days. Use " +
      'when one with the same name already exists and the user wants to change it (e.g. ' +
      '"add evening to my walk" -- pass the full new time_slots list).',
    schema: z.object({
      habit_id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      time_slots: z.array(z.enum(['Morning', 'Noon', 'Evening', 'Night'])).optional(),
      color: z.enum(VALID_COLORS).optional(),
      frequency: z.enum(['Daily', 'Weekly']).optional(),
      goal_value: z.number().optional(),
      unit: z.string().optional(),
      active: z.boolean().optional(),
      target_days: z.number().optional(),
      reason: z.string().optional(),
    }),
  }
);

// ---------------------------------------------------------
// delete_habit
// ---------------------------------------------------------
const deleteHabit = tool(
  async ({ habit_id }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('habits')
      .delete()
      .eq('id', habit_id)
      .eq('user_id', userId)
      .select('title')
      .maybeSingle();

    if (error) return `Error deleting habit: ${error.message}`;
    if (!data) return `Habit ${habit_id} not found or already deleted.`;

    return `Deleted habit "${data.title}".`;
  },
  {
    name: 'delete_habit',
    description: 'Permanently delete a habit. Only use when the user explicitly asks to delete it.',
    schema: z.object({ habit_id: z.string() }),
  }
);

// ---------------------------------------------------------
// list_habits
// ---------------------------------------------------------
const listHabits = tool(
  async (_input, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('habits')
      .select('id, title, frequency, goal_value, unit, active, metadata')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) return `Error listing habits: ${error.message}`;
    if (!data || data.length === 0) return 'The user has no active habits set up yet.';

    return data
      .map((h) => {
        const slots = h.metadata?.timeSlots || [];
        const streak = h.metadata?.streak || 0;
        const target = h.metadata?.targetDays;
        const slotNote = slots.length > 0 ? ` at ${slots.join(' + ')}` : '';
        const streakNote = streak > 0 ? ` (🔥 ${streak})` : '';
        const targetNote = target ? ` [${target}-day plan]` : '';
        return `- ${h.title}${slotNote}${streakNote}${targetNote} — id: ${h.id}`;
      })
      .join('\n');
  },
  {
    name: 'list_habits',
    description: "List the user's habits with slots, streaks, and duration plans.",
    schema: z.object({}),
  }
);

module.exports = { createHabit, updateHabit, deleteHabit, listHabits };