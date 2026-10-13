// backend/services/ai/tools/taskTool.js

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');
const { generateSubtasks } = require('../subtaskGenerator');
const {
  scheduleSubtasks,
  computePreferredWorkHour,
} = require('../subtaskScheduler');

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

    if (!due_date) {
      return (
        'Error: due_date is required. Ask the user when this needs to be done ' +
        'before creating the task.'
      );
    }

    const metadata = {};

    // Determine subtask titles (from AI, or auto-generate if not provided)
    let titles = Array.isArray(subtasks)
      ? subtasks.map((s) => (typeof s === 'string' ? s : String(s.title || s)))
      : [];

    if (titles.length === 0) {
      titles = await generateSubtasks(title, { category, subject });
    }

    // Schedule
    let scheduled = [];
    if (titles.length > 0) {
      const preferredHour = await computePreferredWorkHour(userId);
      scheduled = scheduleSubtasks(titles, due_date, { preferredHour });
    }

    if (scheduled.length > 0) {
      metadata.subtasks = scheduled.map((s, i) => ({
        id: `${Date.now()}-${i}`,
        title: s.title,
        done: false,
        scheduledDate: s.scheduledDate,
        scheduledHour: s.scheduledHour,
        durationMins: s.durationMins,
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
        due_date,
        estimated_minutes: estimated_minutes || null,
        created_by_ai: true,
        created_source: 'AI',
        ai_reason: reason || null,
        metadata,
      })
      .select()
      .single();

    if (error) return `Error creating task: ${error.message}`;

    const subNote = metadata.subtasks?.length
      ? ` with ${metadata.subtasks.length} scheduled subtask(s)`
      : '';

    const scheduleNote =
      metadata.subtasks?.length
        ? ` Steps spread across the days leading to ${due_date}.`
        : '';

    return `Created task "${data.title}"${subNote} (id: ${data.id}, due ${due_date}).${scheduleNote}`;
  },
  {
    name: 'create_task',
    description:
      'Create a new task. due_date is REQUIRED -- if the user has not told you ' +
      'when it needs to be done, ask them BEFORE calling this tool. Subtasks ' +
      'are automatically scheduled across the days between now and the deadline ' +
      'so the user works on the goal in small pieces. Do NOT schedule subtasks ' +
      'yourself; just provide titles and the system spreads them. You can set a ' +
      'category (academic/work/health/home/social/finance/creative/personal) and ' +
      'a short subject string. You can set a color (coral/sky/mint/lavender/teal).',
    schema: z.object({
      title: z.string().describe('Short, action-oriented task title'),
      description: z.string().optional(),
      subtasks: z
        .array(z.string())
        .optional()
        .describe(
          'Optional 2-5 concrete steps. If omitted, the system generates them.'
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
        .optional(),
      subject: z.string().optional(),
      color: z.enum(COLOR_ENUM).optional(),
      priority: z.enum(['Low', 'Medium', 'High']).optional(),
      difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
      due_date: z
        .string()
        .describe(
          'REQUIRED. ISO date (YYYY-MM-DD). If the user has not provided one, ' +
          'do not call this tool -- reply asking when the task is due.'
        ),
      estimated_minutes: z.number().optional(),
      reason: z.string().optional(),
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

    // If new subtasks provided OR title changed and we have a deadline,
    // re-schedule.
    const shouldRegenSubtasks =
      Array.isArray(subtasks) && subtasks.length > 0;

    if (shouldRegenSubtasks) {
      const effectiveDeadline = due_date || existing.due_date;
      if (effectiveDeadline) {
        const preferredHour = await computePreferredWorkHour(userId);
        const scheduled = scheduleSubtasks(subtasks, effectiveDeadline, {
          preferredHour,
        });

        const prior = Array.isArray(metadata.subtasks)
          ? metadata.subtasks
          : [];

        metadata.subtasks = scheduled.map((s, i) => {
          const match = prior.find((p) => p.title === s.title);
          return {
            id: match?.id || `${task_id}-sub-${i}-${Date.now()}`,
            title: s.title,
            done: match?.done || false,
            scheduledDate: s.scheduledDate,
            scheduledHour: s.scheduledHour,
            durationMins: s.durationMins,
          };
        });
      }
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
      'Modify an existing task. Use this when the user wants to change a title, ' +
      'add/replace subtasks, change color/priority/status, or set a due date. ' +
      'Prefer this over creating a sibling task.',
    schema: z.object({
      task_id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      subtasks: z.array(z.string()).optional(),
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
      status: z
        .enum(['Pending', 'In Progress', 'Paused', 'Completed', 'Cancelled'])
        .optional(),
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
      'Delete a task permanently. Only use when the user explicitly asks.',
    schema: z.object({ task_id: z.string() }),
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
    if (!data || data.length === 0)
      return 'The user has no open tasks right now.';

    return data
      .map((t) => {
        const subs = t.metadata?.subtasks || [];
        const done = subs.filter((s) => s.done).length;
        const subInfo = subs.length
          ? ` [${done}/${subs.length} subtasks]`
          : '';
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
      'List open tasks with UUIDs and subtask progress. Use before update_task ' +
      'or delete_task, or when the user asks what to do next.',
    schema: z.object({}),
  }
);

module.exports = {
  createTask,
  updateTask,
  deleteTask,
  listOpenTasks,
};