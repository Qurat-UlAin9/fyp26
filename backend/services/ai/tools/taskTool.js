// backend/services/ai/tools/taskTool.js
//
// ASSUMPTIONS (confirm against your actual tasks table / routes/tasks.js):
// - Column names match AppDataContext.js's taskToApiPayload(): title,
//   description, status, priority, difficulty, due_date, estimated_minutes,
//   created_by_ai, created_source, ai_reason.
// - status enum includes 'Pending'; priority/difficulty include Low/Medium/High.
// If your actual schema differs, tell me and I'll adjust field names --
// the tool-definition shape (zod schema, what the LLM sees) won't need to
// change, only the insert payload below.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const createTask = tool(
  async ({ title, description, priority, difficulty, due_date, estimated_minutes, reason }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        user_id: userId,
        title,
        description: description || null,
        status: 'Pending',
        priority: priority || 'Medium',
        difficulty: difficulty || 'Medium',
        due_date: due_date || null,
        estimated_minutes: estimated_minutes || null,
        created_by_ai: true,
        created_source: 'AI',
        ai_reason: reason || null,
      })
      .select()
      .single();

    if (error) return `Error creating task: ${error.message}`;
    return `Created task "${data.title}" (id: ${data.id})${due_date ? `, due ${due_date}` : ''}.`;
  },
  {
    name: 'create_task',
    description:
      'Create a new task for the user. Use this when the user asks you to remind them to do ' +
      'something, or when you break a bigger goal into a concrete action they should track. ' +
      'Always explain briefly (in `reason`) why you created it, e.g. "user mentioned forgetting ' +
      'to submit assignments."',
    schema: z.object({
      title: z.string().describe('Short, action-oriented task title, e.g. "Email professor about extension"'),
      description: z.string().optional().describe('Optional extra detail'),
      priority: z.enum(['Low', 'Medium', 'High']).optional(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      due_date: z.string().optional().describe('ISO date string, e.g. "2026-09-15", if the user gave a deadline'),
      estimated_minutes: z.number().optional().describe('Rough estimate of how long this will take'),
      reason: z.string().optional().describe('One sentence: why you created this task, for the task history'),
    }),
  }
);

const listOpenTasks = tool(
  async (_input, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .eq('user_id', userId)
      .neq('status', 'Completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10);

    if (error) return `Error listing tasks: ${error.message}`;
    if (!data || data.length === 0) return 'The user has no open tasks right now.';

    return data
      .map((t) => `- [${t.priority}] ${t.title}${t.due_date ? ` (due ${t.due_date})` : ''}`)
      .join('\n');
  },
  {
    name: 'list_open_tasks',
    description:
      'List the user\'s current open (non-completed) tasks. Use this before creating a new task ' +
      'to avoid duplicates, or when the user asks "what do I need to do".',
    schema: z.object({}),
  }
);

module.exports = { createTask, listOpenTasks };
