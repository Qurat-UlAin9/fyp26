// backend/services/ai/context/taskCoachContext.js
//
// "Ask coach" on a step: the app only sends ids (taskId, subtaskId). The server loads everything
// else itself, so the coach always sees the CURRENT state (what the task is, what kind of task it
// is, every step with its status, which step is open) and the app cannot send made-up context.

const { supabaseAdmin } = require('../../../config/supabase');
const time = require('./timeContext');
const { isMissedStep } = require('../scheduleCore');

/**
 * @param {string} userId
 * @param {{ taskId?: string, subtaskId?: string, taskTitle?: string, subtaskTitle?: string }} ctx
 * @returns the same object, enriched. Falls back to the original ctx when the task cannot be loaded.
 */
async function buildTaskCoachContext(userId, ctx) {
  if (!ctx || typeof ctx !== 'object' || !ctx.taskId) return ctx || null;

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, status, due_date, metadata')
    .eq('id', ctx.taskId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !task) return ctx;

  const tz = await time.getUserTimezone(userId);
  const now = time.nowInTz(tz);
  const nowHour = now.hour + now.minute / 60;

  const subs = Array.isArray(task.metadata?.subtasks) ? task.metadata.subtasks : [];
  const steps = subs.map((s, i) => ({
    n: i + 1,
    id: s.id,
    title: s.title,
    detail: s.detail || null,
    kind: s.kind || 'do',
    done: !!s.done,
    note: s.note || null,
    missed: isMissedStep(s, now.iso, nowHour),
    scheduledDate: s.scheduledDate || null,
    scheduledHour: Number.isFinite(Number(s.scheduledHour)) ? Number(s.scheduledHour) : null,
    durationMins: s.durationMins || null,
  }));

  const currentIdx = steps.findIndex((s) => String(s.id) === String(ctx.subtaskId));
  const current = currentIdx >= 0 ? steps[currentIdx] : null;

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description || null,
    taskStatus: task.status,
    taskType: task.metadata?.taskType || null, // understand | do | mixed
    materials: Array.isArray(task.metadata?.materials) ? task.metadata.materials : [],
    dueDate: task.due_date ? String(task.due_date).slice(0, 10) : null,
    today: now.iso,
    steps,
    totalSteps: steps.length,
    doneSteps: steps.filter((s) => s.done).length,
    current,
    // the app's own title, used when the step is not in the list any more
    subtaskId: ctx.subtaskId || null,
    subtaskTitle: current?.title || ctx.subtaskTitle || null,
  };
}

module.exports = { buildTaskCoachContext };
