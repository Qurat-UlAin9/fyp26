// backend/services/ai/tools/taskTool.js
//
// Column names match Migration 05 (tasks).
// Subtasks and theme live in `metadata` (JSONB) to match frontend shape.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');

const COLOR_ENUM = ['coral', 'sky', 'mint', 'lavender', 'teal'];

// ---------------------------------------------------------
// create_task
// ---------------------------------------------------------
const createTask = tool(
  async (
    {
      title,
      description,
      subtasks,
      category,
      subject,
      color,
      priority,
      difficulty,
      due_date,
      estimated_minutes,
      reason,
    },
    config
  ) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const metadata = {};

    if (Array.isArray(subtasks) && subtasks.length > 0) {
      metadata.subtasks = subtasks.map((s, i) => ({
        id: `${Date.now()}-${i}`,
        title: typeof s === 'string' ? s : String(s.title || s),
        done: typeof s === 'string' ? false : Boolean(s.done),
      }));
    }

    if (color) metadata.themeId = color;
    if (category) metadata.category = category;
    if (subject) metadata.subject = subject;

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
        metadata,
      })
      .select()
      .single();

    if (error) return `Error creating task: ${error.message}`;

    const subNote =
      metadata.subtasks?.length
        ? ` with ${metadata.subtasks.length} subtask(s)`
        : '';
    return `Created task "${data.title}"${subNote} (id: ${data.id}).`;
  },
  {
    name: 'create_task',
    description:
      'Create a new task for the user. Use when the user asks you to remind them to do ' +
      'something, break a bigger goal into concrete actions, or when you decide a task is ' +
      'the right way to help. You CAN provide subtasks in the same call -- use this instead ' +
      'of creating multiple sibling tasks. You CAN set a category (academic/work/health/home/' +
      'social/finance/creative/personal) and a short subject string to give the task more ' +
      'context. You CAN set a color (coral/sky/mint/lavender/teal) if the user has expressed ' +
      'a preference or to make the task visually distinct.',
    schema: z.object({
      title: z.string().describe('Short, action-oriented task title'),
      description: z.string().optional(),
      subtasks: z
        .array(z.string())
        .optional()
        .describe(
          'If this is a bigger goal, provide 2-5 concrete steps as separate strings. ' +
          'They become checkable subtasks under this ONE task.'
        ),
      category: z
        .enum([
          'academic',
          'work',
          'health',
          'home',
          'social',
          'finance',
          'creative',
          'personal',
        ])
        .optional()
        .describe(
          'Domain this task belongs to. Infer from the user\'s message when ' +
          'clear; omit if ambiguous. Not a category label to show the user -- ' +
          'just helps group and adapt.'
        ),
      subject: z
        .string()
        .optional()
        .describe(
          'Specific focus within the category, e.g. "Neural networks survey", ' +
          '"presentation to client", "chapter 5 problems". Only set if the ' +
          'user gave a specific subject; do not invent one.'
        ),
      color: z
        .enum(COLOR_ENUM)
        .optional()
        .describe('Card color; only set if the user asked for a specific one or has a stated preference'),
      priority: z.enum(['Low', 'Medium', 'High']).optional(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      due_date: z
        .string()
        .optional()
        .describe('ISO date string, e.g. "2026-10-12", if the user gave a deadline'),
      estimated_minutes: z.number().optional(),
      reason: z.string().optional().describe('One sentence: why you created this task'),
    }),
  }
);

// ---------------------------------------------------------
// update_task
// ---------------------------------------------------------
const updateTask = tool(
  async (
    {
      task_id,
      title,
      description,
      subtasks,
      category,
      subject,
      color,
      status,
      priority,
      difficulty,
      due_date,
      estimated_minutes,
      reason,
    },
    config
  ) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    // Fetch existing row to merge metadata correctly
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) return `Error fetching task: ${fetchError.message}`;
    if (!existing) return `Error: task ${task_id} not found for this user.`;

    const patch = {};

    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (status !== undefined) patch.status = status;
    if (priority !== undefined) patch.priority = priority;
    if (difficulty !== undefined) patch.difficulty = difficulty;
    if (due_date !== undefined) patch.due_date = due_date;
    if (estimated_minutes !== undefined)
      patch.estimated_minutes = estimated_minutes;
    if (reason !== undefined) patch.ai_reason = reason;

    const metadata = { ...(existing.metadata || {}) };

    if (Array.isArray(subtasks)) {
      // Preserve done-state for matching titles where possible
      const prior = Array.isArray(metadata.subtasks) ? metadata.subtasks : [];
      metadata.subtasks = subtasks.map((s, i) => {
        const title = typeof s === 'string' ? s : String(s.title || s);
        const match = prior.find((p) => p.title === title);
        return {
          id: match?.id || `${task_id}-sub-${i}-${Date.now()}`,
          title,
          done: match?.done || false,
        };
      });
    }

    if (color !== undefined) metadata.themeId = color;
    if (category !== undefined) metadata.category = category;
    if (subject !== undefined) metadata.subject = subject;

    if (Object.keys(metadata).length > 0) patch.metadata = metadata;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(patch)
      .eq('id', task_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return `Error updating task: ${error.message}`;

    const fields = Object.keys(patch).filter((k) => k !== 'metadata');
    return `Updated task "${data.title}" (fields changed: ${
      fields.length ? fields.join(', ') : 'metadata only'
    }).`;
  },
  {
    name: 'update_task',
    description:
      'Modify an existing task. Use this when the user wants to change a task\'s title, add ' +
      'or replace its subtasks, change its color/priority/status, or set a due date. ' +
      'IMPORTANT: prefer this over creating a new sibling task. If the user says "break down ' +
      'the task I just made into steps", call update_task with subtasks=[...] on the existing ' +
      'task_id, NOT create_task again.',
    schema: z.object({
      task_id: z.string().describe('The UUID of the task to update'),
      title: z.string().optional(),
      description: z.string().optional(),
      subtasks: z
        .array(z.string())
        .optional()
        .describe('Replaces the task\'s subtask list. Preserves done-state for matching titles.'),
      category: z
        .enum([
          'academic',
          'work',
          'health',
          'home',
          'social',
          'finance',
          'creative',
          'personal',
        ])
        .optional(),
      subject: z.string().optional(),
      color: z.enum(COLOR_ENUM).optional(),
      status: z.enum(['Pending', 'In Progress', 'Paused', 'Completed', 'Cancelled']).optional(),
      priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      due_date: z.string().optional(),
      estimated_minutes: z.number().optional(),
      reason: z.string().optional(),
    }),
  }
);

// ---------------------------------------------------------
// delete_task
// ---------------------------------------------------------
const deleteTask = tool(
  async ({ task_id }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', task_id)
      .eq('user_id', userId)
      .select('title')
      .maybeSingle();

    if (error) return `Error deleting task: ${error.message}`;
    if (!data) return `Task ${task_id} not found or already deleted.`;

    return `Deleted task "${data.title}".`;
  },
  {
    name: 'delete_task',
    description:
      'Delete a task permanently. Only use when the user explicitly asks to delete or remove a task.',
    schema: z.object({
      task_id: z.string().describe('The UUID of the task to delete'),
    }),
  }
);

// ---------------------------------------------------------
// list_open_tasks
// ---------------------------------------------------------
const listOpenTasks = tool(
  async (_input, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, due_date, metadata')
      .eq('user_id', userId)
      .neq('status', 'Completed')
      .neq('status', 'Cancelled')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(15);

    if (error) return `Error listing tasks: ${error.message}`;
    if (!data || data.length === 0) return 'The user has no open tasks right now.';

    return data
      .map((t) => {
        const subs = t.metadata?.subtasks || [];
        const done = subs.filter((s) => s.done).length;
        const subInfo = subs.length ? ` [${done}/${subs.length} subtasks]` : '';
        const due = t.due_date
          ? ` (due ${String(t.due_date).slice(0, 10)})`
          : '';
        return `- [${t.priority}] ${t.title}${subInfo}${due} — id: ${t.id}`;
      })
      .join('\n');
  },
  {
    name: 'list_open_tasks',
    description:
      'List the user\'s open (non-completed) tasks, with their UUIDs and current subtask ' +
      'progress. Use this before calling update_task or delete_task so you have the right ' +
      'task_id, or when the user asks what they need to do.',
    schema: z.object({}),
  }
);

module.exports = {
  createTask,
  updateTask,
  deleteTask,
  listOpenTasks,
};