// backend/services/ai/tools/habitTool.js
//
// ASSUMPTIONS (confirm against habitToApiPayload() in AppDataContext.js):
// - Columns: title, description, frequency, goal_value, unit, active,
//   created_by_ai. Frequency assumed to include 'Daily'/'Weekly'.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const createHabit = tool(
  async ({ title, description, frequency, goal_value, unit, reason }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('habits')
      .insert({
        user_id: userId,
        title,
        description: description || null,
        frequency: frequency || 'Daily',
        goal_value: goal_value || 1,
        unit: unit || 'times',
        active: true,
        created_by_ai: true,
      })
      .select()
      .single();

    if (error) return `Error creating habit: ${error.message}`;
    return `Created habit "${data.title}" (${data.frequency}, goal ${data.goal_value} ${data.unit})${reason ? ` -- ${reason}` : ''}.`;
  },
  {
    name: 'create_habit',
    description:
      'Create a new recurring habit for the user to track. Use this for behaviors they want to ' +
      'build consistently (e.g. "drink more water", "journal every evening"), not one-off tasks -- ' +
      'use create_task for those instead.',
    schema: z.object({
      title: z.string().describe('Short habit name, e.g. "Evening journaling"'),
      description: z.string().optional(),
      frequency: z.enum(['Daily', 'Weekly']).optional(),
      goal_value: z.number().optional().describe('Target count per period, e.g. 1 for once daily, 3 for 3x/week'),
      unit: z.string().optional().describe('Unit of the goal, e.g. "times", "minutes", "glasses"'),
      reason: z.string().optional(),
    }),
  }
);

const listHabits = tool(
  async (_input, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('habits')
      .select('id, title, frequency, goal_value, unit, active')
      .eq('user_id', userId)
      .eq('active', true);

    if (error) return `Error listing habits: ${error.message}`;
    if (!data || data.length === 0) return 'The user has no active habits set up yet.';

    return data.map((h) => `- ${h.title} (${h.frequency}, goal ${h.goal_value} ${h.unit})`).join('\n');
  },
  {
    name: 'list_habits',
    description: "List the user's active habits. Use this before suggesting a new habit, to avoid duplicates.",
    schema: z.object({}),
  }
);

module.exports = { createHabit, listHabits };
