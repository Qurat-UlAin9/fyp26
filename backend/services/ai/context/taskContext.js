// backend/services/ai/context/taskContext.js
//
// Puts the user's open tasks (and the NEXT step of each) straight into the
// prompt, so the coach never has to "decide to look" before it can help.
// Cheap: one query, ~150-250 tokens.

const { supabaseAdmin } = require('../../../config/supabase');

const MAX_TASKS = 5;

const fmtHour = (h) => {
  const n = Number(h);
  if (!Number.isFinite(n)) return '';
  const hh = Math.floor(n);
  const mm = Math.round((n - hh) * 60);
  return `${hh}:${String(mm).padStart(2, '0')}`;
};

async function fetchOpenTasks(userId) {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, due_date, metadata')
    .eq('user_id', userId)
    .neq('status', 'Completed')
    .neq('status', 'Cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(MAX_TASKS);
  if (error) throw error;
  return data || [];
}

function formatTaskBlock(tasks) {
  if (!tasks || tasks.length === 0) {
    return (
      '\nOPEN TASKS: the user has no open tasks right now. If they mention work, a deadline or ' +
      'feeling overwhelmed, offer to make a task together (ask what it is and when it is due, then create_task).\n'
    );
  }
  let block = '\nOPEN TASKS (current, from the app; use these ids directly, never invent ids):\n';
  tasks.forEach((t) => {
    const subs = Array.isArray(t.metadata?.subtasks) ? t.metadata.subtasks : [];
    const done = subs.filter((s) => s.done).length;
    const next = subs.find((s) => !s.done);
    const due = t.due_date ? `, due ${String(t.due_date).slice(0, 10)}` : '';
    block += `- "${t.title}" (task_id: ${t.id}${due}, ${t.priority || 'Medium'} priority, ${done}/${subs.length} steps done)`;
    if (next) {
      const when = next.scheduledDate ? `, scheduled ${next.scheduledDate} ${fmtHour(next.scheduledHour)}` : '';
      block += `\n    NEXT STEP: "${next.title}" (subtask_id: ${next.id}${when})`;
    }
    block += '\n';
  });
  block +=
    'TASK RULES: If the user mentions work that matches a task above, work on that task. Do NOT create a duplicate. ' +
    'If it matches nothing and they want help, ask what it is and when it is due, then create_task. ' +
    'When they seem overwhelmed, name the single most urgent NEXT STEP and offer to start it. ' +
    'Do not only say "look at your tasks": do the helpful thing yourself.\n';
  return block;
}

module.exports = { fetchOpenTasks, formatTaskBlock };
