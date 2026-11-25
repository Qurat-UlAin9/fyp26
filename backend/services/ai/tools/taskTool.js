// backend/services/ai/tools/taskTool.js

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { supabaseAdmin } = require('../../../config/supabase');
const { pushAppAction } = require('./appActions');
const rewards = require('../../rewards/rewardsService');
const time = require('../context/timeContext');
const { getPlanningContext, planTask, scheduleSteps, estimateAvailableMinutes, describeSchedule } = require('../subtaskPlanner');

const COLOR_ENUM = ['coral', 'sky', 'mint', 'lavender', 'teal'];
const CATEGORY_COLOR = {
  academic: 'sky', work: 'lavender', health: 'mint', home: 'teal',
  social: 'coral', finance: 'teal', creative: 'lavender', personal: 'mint',
};

// The model rarely picks a color, so every card came out coral. Choose one in code:
// the category's color, unless one of the user's last two tasks already uses it.
async function pickColor(userId, category, asked) {
  if (COLOR_ENUM.includes(asked)) return asked;
  let recent = [];
  try {
    const { data } = await supabaseAdmin
      .from('tasks').select('metadata').eq('user_id', userId).order('created_at', { ascending: false }).limit(2);
    recent = (data || []).map((t) => t.metadata?.themeId).filter(Boolean);
  } catch (_) { /* no history */ }
  const preferred = CATEGORY_COLOR[category];
  if (preferred && !recent.includes(preferred)) return preferred;
  return COLOR_ENUM.find((c) => !recent.includes(c)) || COLOR_ENUM[0];
}

const fmtHour = (h) => {
  const n = Number(h);
  if (!Number.isFinite(n)) return '';
  const hh = Math.floor(n);
  const mm = Math.round((n - hh) * 60);
  return `${hh}:${String(mm).padStart(2, '0')}`;
};

const describeSub = (s, i) =>
  `${i + 1}. [${s.done ? 'done' : 'todo'}] ${s.title}` +
  `${s.note ? ` (result: ${s.note})` : ''} — subtask_id: ${s.id}` +
  `${s.scheduledDate ? `, scheduled ${s.scheduledDate} at ${fmtHour(s.scheduledHour)}` : ''}`;

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

    // Dates are decided in code, in the user's timezone (the model cannot know today's date)
    const tz = config?.configurable?.timezone || (await time.getUserTimezone(userId));
    const dueISO = time.resolveDueDate(due_date, tz);
    const now = time.nowInTz(tz);
    if (!dueISO) {
      return `Error: I could not understand the due date "${due_date}". Ask the user for the exact day.`;
    }
    if (dueISO < now.iso) {
      return `Error: ${dueISO} is already in the past (today is ${now.iso}). Ask the user which day they meant.`;
    }

    const metadata = {};

    // Plan the steps: small, with a time cap, done together with the coach.
    // Only use the model's own list when the user dictated the steps.
    const plan = await getPlanningContext(userId, tz);
    const daysLeft = time.diffDaysISO(now.iso, dueISO);
    let steps;
    let planned = null;
    const userSteps = Array.isArray(subtasks)
      ? subtasks.map((x) => (typeof x === 'string' ? x : String(x.title || x))).filter(Boolean)
      : [];
    if (userSteps.length > 0) {
      steps = userSteps.map((t) => ({ title: t, minutes: Math.min(15, plan.maxSession), kind: 'do' }));
    } else {
      // tell the planner how much free time there really is (window, habits, other tasks), so a tight
      // deadline gets fewer steps instead of an impossible plan
      const availableMinutes = estimateAvailableMinutes({
        today: now.iso,
        nowHour: now.hour + now.minute / 60,
        deadline: dueISO,
        ...plan.schedOpts,
      });
      planned = await planTask(
        { title, description, category, subject, difficulty, daysLeft, availableMinutes },
        plan.maxSession
      );
      steps = planned.steps;
    }

    const sched = scheduleSteps(steps, {
      today: now.iso,
      nowHour: now.hour + now.minute / 60,
      deadline: dueISO,
      ...plan.schedOpts,
    });
    const scheduled = sched.items;
    const totalMinutes = sched.neededMinutes;

    if (scheduled.length > 0) {
      metadata.subtasks = scheduled.map((s, i) => ({
        id: `${Date.now()}-${i}`,
        title: s.title,
        done: false,
        kind: s.kind,
        ...(s.detail ? { detail: s.detail } : {}),
        scheduledDate: s.scheduledDate,
        scheduledHour: s.scheduledHour,
        durationMins: s.durationMins,
      }));
    }
    if (planned) {
      metadata.taskType = planned.taskType;
      if (planned.materials.length) metadata.materials = planned.materials;
    }

    metadata.themeId = await pickColor(userId, category, color);
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
        due_date: dueISO,
        estimated_minutes: estimated_minutes || totalMinutes || null,
        created_by_ai: true,
        created_source: 'AI',
        ai_reason: reason || null,
        metadata,
      })
      .select()
      .single();

    if (error) return `Error creating task: ${error.message}`;

    const planLines = scheduled.map(
      (s, i) =>
        `${i + 1}. [${s.durationMins} min, ${s.kind}] ${s.title}${s.detail ? ` (${s.detail})` : ''} — ${time.friendlyDate(s.scheduledDate, now.iso)}, ${time.friendlyTime(s.scheduledHour)}`
    );
    const tightNote = describeSchedule(sched, { deadline: time.friendlyDate(dueISO, now.iso) });
    return (
      `Created task "${data.title}" (task_id: ${data.id}), due ${time.friendlyDate(dueISO, now.iso)} (${dueISO}).\n` +
      `Plan: ${scheduled.length} steps, about ${totalMinutes} min in total, each at most ${plan.maxSession} min, ` +
      `placed in the user's ${time.friendlyTime(sched.window.start)}-${time.friendlyTime(sched.window.end % 24)} work slot and spread over the days ` +
      `(a spare day is kept before the deadline when there is room). Times are the user's local time:\n` +
      planLines.join('\n') +
      tightNote +
      `\nSubtask ids are in get_task_details. Read dates and times to the user exactly as written above. ` +
      `Steps marked "learn" are taught by you in chat. A "prepare" step is a checklist of what to gather: go through it with the user when they start it. ` +
      `Offer to start the first step right now.`
    );
  },
  {
    name: 'create_task',
    description:
      'Create a new task. due_date is REQUIRED -- if the user has not told you ' +
      'when it needs to be done, ask them BEFORE calling this tool. Subtasks ' +
      'are planned and scheduled by the system (small steps with a time cap, spread over free days). ' +
      'Do NOT write or schedule subtasks yourself. You can set a ' +
      'category (academic/work/health/home/social/finance/creative/personal) and ' +
      'a short subject string. You can set a color (coral/sky/mint/lavender/teal).',
    schema: z.object({
      title: z.string().describe('Short, action-oriented task title'),
      description: z.string().optional(),
      subtasks: z
        .array(z.string())
        .optional()
        .describe(
          'Leave this out. The planner writes the steps. Only pass it if the user dictated their own steps.'
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
          'REQUIRED. YYYY-MM-DD from the calendar in your context (or the user\'s words like "monday" or "in 3 days"). ' +
          'If the user has not said when it is due, do not call this tool: ask.'
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
    // Dates are decided in code, in the user's timezone
    const tz = config?.configurable?.timezone || (await time.getUserTimezone(userId));
    const now = time.nowInTz(tz);
    let dueISO = null;
    if (due_date !== undefined) {
      dueISO = time.resolveDueDate(due_date, tz);
      if (!dueISO) return `Error: I could not understand the due date "${due_date}". Ask the user for the exact day.`;
      if (dueISO < now.iso) return `Error: ${dueISO} is already in the past (today is ${now.iso}). Ask the user which day they meant.`;
      patch.due_date = dueISO;
    }
    if (estimated_minutes !== undefined)
      patch.estimated_minutes = estimated_minutes;
    if (reason !== undefined) patch.ai_reason = reason;

    const metadata = { ...(existing.metadata || {}) };

    // New deadline, or the user dictated a new list: re-plan the steps that are not done yet
    const oldDue = String(existing.due_date || '').slice(0, 10);
    const dueChanged = !!dueISO && dueISO !== oldDue;
    const hasNewList = Array.isArray(subtasks) && subtasks.length > 0;
    let moveNote = '';

    if (dueChanged || hasNewList) {
      const deadline = dueISO || oldDue;
      if (deadline) {
        const plan = await getPlanningContext(userId, tz, { excludeTaskId: task_id });
        const prior = Array.isArray(metadata.subtasks) ? metadata.subtasks : [];
        const doneOnes = prior.filter((p) => p.done);
        const titlesOf = (list) => list.map((x) => (typeof x === 'string' ? x : String(x.title || x))).filter(Boolean);

        const todo = hasNewList
          ? titlesOf(subtasks)
              .filter((t) => !doneOnes.some((d) => d.title === t))
              .map((t) => ({ title: t, minutes: Math.min(15, plan.maxSession), kind: 'do' }))
          : prior.filter((p) => !p.done).map((p) => ({ title: p.title, minutes: p.durationMins || 15, kind: p.kind || 'do' }));

        const sched = scheduleSteps(todo, {
          today: now.iso,
          nowHour: now.hour + now.minute / 60,
          deadline: deadline < now.iso ? now.iso : deadline,
          ...plan.schedOpts,
        });

        metadata.subtasks = [
          ...doneOnes,
          ...sched.items.map((s, i) => ({
            id: prior.find((p) => p.title === s.title)?.id || `${task_id}-sub-${i}-${Date.now()}`,
            title: s.title,
            done: false,
            kind: s.kind,
            scheduledDate: s.scheduledDate,
            scheduledHour: s.scheduledHour,
            durationMins: s.durationMins,
          })),
        ];
        moveNote =
          `\nRe-planned the remaining steps:\n` +
          sched.items
            .map((s, i) => `${i + 1}. ${s.title} — ${time.friendlyDate(s.scheduledDate, now.iso)}, ${time.friendlyTime(s.scheduledHour)}`)
            .join('\n') +
          describeSchedule(sched, { deadline: time.friendlyDate(deadline, now.iso) });
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
    }).${moveNote}`;
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

// ---------------------------------------------------------
// get_task_details
// ---------------------------------------------------------
const getTaskDetails = tool(
  async ({ task_id }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('id, title, status, due_date, metadata')
      .eq('id', task_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return `Error fetching task: ${error.message}`;
    if (!data) return `Task ${task_id} not found.`;

    const subs = data.metadata?.subtasks || [];
    return (
      `Task "${data.title}" (task_id: ${data.id}, status ${data.status}, due ${String(data.due_date || '').slice(0, 10)}).\n` +
      (subs.length ? subs.map(describeSub).join('\n') : 'No subtasks.')
    );
  },
  {
    name: 'get_task_details',
    description: 'Get one task with its subtasks, their ids, done state and scheduled times.',
    schema: z.object({ task_id: z.string() }),
  }
);

// ---------------------------------------------------------
// complete_subtask
// ---------------------------------------------------------
const completeSubtask = tool(
  async ({ task_id, subtask_id, subtask_title, note }, config) => {
    const userId = config?.configurable?.userId;
    if (!userId) return 'Error: no authenticated user in context.';

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .select('id, title, status, metadata')
      .eq('id', task_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return `Error fetching task: ${error.message}`;
    if (!task) return `Error: task ${task_id} not found.`;

    const subs = Array.isArray(task.metadata?.subtasks) ? [...task.metadata.subtasks] : [];
    let idx = -1;
    if (subtask_id) idx = subs.findIndex((s) => s.id === subtask_id);
    if (idx < 0 && subtask_title) {
      const q = subtask_title.toLowerCase();
      idx = subs.findIndex((s) => String(s.title).toLowerCase().includes(q));
    }
    if (idx < 0) return 'Error: subtask not found. Call get_task_details to get the right subtask_id.';

    if (subs[idx].done) return `Subtask "${subs[idx].title}" is already done.`;

    const earlier = subs.slice(0, idx).find((s) => !s.done);
    if (earlier) {
      return `Not done: the earlier step "${earlier.title}" is still open. Steps must be finished in order. Offer to work on that step first.`;
    }

    const cleanNote = note ? String(note).trim().slice(0, 80) : '';
    const baseTitle = subs[idx].title;
    subs[idx] = {
      ...subs[idx],
      done: true,
      note: cleanNote || subs[idx].note,
      title: cleanNote && !baseTitle.includes(cleanNote) ? `${baseTitle}: ${cleanNote}` : baseTitle,
      completedAt: new Date().toISOString(),
      completedVia: 'ai',
    };

    const allDone = subs.every((s) => s.done);
    const patch = { metadata: { ...(task.metadata || {}), subtasks: subs } };
    if (allDone) {
      patch.status = 'Completed';
      patch.completed_at = new Date().toISOString();
    }

    const { error: upErr } = await supabaseAdmin
      .from('tasks')
      .update(patch)
      .eq('id', task_id)
      .eq('user_id', userId);
    if (upErr) return `Error updating task: ${upErr.message}`;

    // Award the same coins a manual tick gives (saved on the server), and tell the app to refresh
    let earned = 0;
    try {
      earned += (await rewards.applyEvent(userId, { kind: 'subtask' })).delta;
      if (allDone) earned += (await rewards.applyEvent(userId, { kind: 'task' })).delta;
      if (earned > 0) pushAppAction(config, { type: 'rewards_changed', earned });
    } catch (e) {
      console.warn('[rewards] step coins failed:', e.message);
    }
    const coinNote = earned > 0 ? ` The user earned ${earned} coins.` : '';

    const next = subs.find((s) => !s.done);
    if (allDone) return `Marked "${baseTitle}" done. That was the LAST step, so the whole task "${task.title}" is now complete.${coinNote} Celebrate it.`;
    return (
      `Marked "${baseTitle}" done${cleanNote ? ` (result saved: ${cleanNote})` : ''}.${coinNote} ` +
      `Next step: "${next.title}" (subtask_id: ${next.id})` +
      `${next.scheduledDate ? `, scheduled ${next.scheduledDate} at ${fmtHour(next.scheduledHour)}` : ''}. ` +
      `${subs.filter((s) => s.done).length}/${subs.length} steps done.`
    );
  },
  {
    name: 'complete_subtask',
    description:
      'Mark ONE subtask as done, optionally saving its result (e.g. the topic the user picked) in note. ' +
      'Only call after the user has confirmed they finished it. Steps must be completed in order. ' +
      'Get ids from list_open_tasks, get_task_details or create_task; never invent them.',
    schema: z.object({
      task_id: z.string(),
      subtask_id: z.string().optional(),
      subtask_title: z.string().optional().describe('Only if you do not have the id'),
      note: z.string().optional().describe('The result of the step, e.g. the chosen topic name'),
    }),
  }
);

module.exports = {
  completeSubtask,
  getTaskDetails,
  createTask,
  updateTask,
  deleteTask,
  listOpenTasks,
};