// backend/services/ai/subtaskPlanner.js
//
// Turns a task into a plan the user can actually follow:
//   1. planSteps():     small steps, each with a time cap (the user's focus length) and a purpose.
//                       Steps are done WITH the coach, never "go watch a tutorial".
//   2. scheduleSteps(): places the steps on real days and hours, around the steps the user already
//                       has, with a limit per day and a buffer day before the deadline.
// Dates, hours and limits are decided in code. The model only writes the step wording.

const { createChatModel } = require('./llmProvider');
const { supabaseAdmin } = require('../../config/supabase');
const time = require('./context/timeContext');
const { computePreferredWorkHour } = require('./subtaskScheduler');
const core = require('./scheduleCore');
const { habitBlocksFromRows } = require('./habitTimes');

const { scheduleSteps, estimateAvailableMinutes, describeSchedule, isMissedStep } = core;

const DEFAULT_MAX_SESSION = 25; // minutes; the user's preferred focus length overrides it
const MIN_SESSION = 10;
const MAX_SESSION = 45;

const model = createChatModel({ temperature: 0.4, maxTokens: 700 });

// ---------------------------------------------------------------- planning context

// The daily window steps are placed in (default 6 PM - 10 PM). It is read from user_preferences
// (task_window_start / task_window_end, in hours) when those columns exist, and falls back to the default.
async function getTaskWindow(userId) {
  try {
    const { data } = await supabaseAdmin.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
    return core.normalizeWindow(data?.task_window_start, data?.task_window_end);
  } catch (_) {
    return core.normalizeWindow();
  }
}

async function getPlanningContext(userId, tz, { excludeTaskId = null } = {}) {
  const today = time.nowInTz(tz).iso;
  let maxSession = DEFAULT_MAX_SESSION;
  try {
    const { data } = await supabaseAdmin.from('adhd_profile').select('preferred_focus_length').eq('user_id', userId).maybeSingle();
    const n = Number(data?.preferred_focus_length);
    if (Number.isFinite(n) && n > 0) maxSession = Math.max(MIN_SESSION, Math.min(MAX_SESSION, Math.round(n)));
  } catch (_) { /* default */ }

  const preferredHour = await computePreferredWorkHour(userId, tz);
  const window = await getTaskWindow(userId);
  // a step can never be longer than the user's daily window
  maxSession = Math.max(5, Math.min(maxSession, Math.floor((window.end - window.start) * 60)));

  // steps the user already has scheduled on other open tasks
  const busy = [];
  try {
    const { data } = await supabaseAdmin.from('tasks').select('id, status, metadata').eq('user_id', userId).neq('status', 'Completed');
    (data || []).forEach((t) => {
      if (excludeTaskId && t.id === excludeTaskId) return;
      (t.metadata?.subtasks || []).forEach((s) => {
        if (!s.done && s.scheduledDate && s.scheduledDate >= today && Number.isFinite(Number(s.scheduledHour))) {
          busy.push({ date: s.scheduledDate, hour: Number(s.scheduledHour), minutes: Number(s.durationMins) || 30 });
        }
      });
    });
  } catch (_) { /* no busy info */ }

  // habits are fixed points the steps must not sit on
  let habitBlocks = [];
  try {
    const { data } = await supabaseAdmin.from('habits').select('active, frequency, metadata').eq('user_id', userId).eq('active', true);
    habitBlocks = habitBlocksFromRows(data, today);
  } catch (_) { /* no habit info */ }

  return {
    today,
    maxSession,
    preferredHour,
    busy,
    habitBlocks,
    window,
    // pass this straight into scheduleSteps / estimateAvailableMinutes
    schedOpts: { preferredHour, busy, habitBlocks, windowStart: window.start, windowEnd: window.end },
  };
}

// ---------------------------------------------------------------- step writing

const BANNED = /\b(watch|youtube|videos?|tutorials?|google|research|look up|browse|wikipedia)\b|\bread\b[^.]*\b(blog|article|paper|chapter|docs?|documentation|post|book)\b|\bsearch\b[^.]*\b(online|web|internet)\b/i;

// A step is only "outside material" if the task itself did not ask for that (e.g. "read chapter 3")
function sendsOutside(stepTitle, taskText) {
  const m = String(stepTitle).match(BANNED);
  if (!m) return false;
  const word = m[0].toLowerCase().split(/\s+/)[0];
  return !String(taskText || '').toLowerCase().includes(word);
}

const SYSTEM_PROMPT = `You plan a task for someone with ADHD. The user does every step TOGETHER with their AI coach (Compass) inside the AIMS app, in one sitting.

Return ONLY a JSON array, no markdown, in this shape:
[{"title": string, "minutes": number, "kind": "learn" | "do" | "decide" | "review"}]

How to plan:
- Think about how big and hard the task really is, then choose 3 to 8 steps. A bigger or harder task gets MORE steps, never longer ones.
- Every step must fit inside the time cap you are given (minutes <= cap). Use the real time a step needs: 5 to 10 for tiny or easy steps, up to the cap for the hardest.
- The first step must be very easy to start (10 minutes or less) and give a quick win.
- kind "learn": the coach teaches this part in chat (what it is, why it matters, how it works, in small pieces). Write it as "Learn <specific thing> with Compass". Follow a learn step with a "do" step where the user uses it: explain it back in their own words, answer a few questions, write a short summary, solve one small problem.
- kind "do": makes one visible result. kind "decide": choose or narrow something. kind "review": check the result and finish.
- The coach is the helper. Never send the user to outside material: no watching videos or tutorials, no reading articles, blogs, papers or docs, no searching the web, unless the task itself names that exact resource.
- Each title: imperative, at most 12 words, uses the real subject words from the task, says the exact output. No vague verbs like "research", "work on", "prepare", "plan".
- Do not repeat the task title as a step. Order steps in the sequence they should happen. The last step is a short review or finish line.`;

function parseSteps(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const tryParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
  let parsed = tryParse(text);
  if (!Array.isArray(parsed)) {
    const m = text.match(/\[[\s\S]*\]/);
    parsed = m ? tryParse(m[0]) : null;
  }
  if (!Array.isArray(parsed)) return null;
  return parsed;
}

function cleanSteps(list, maxSession, taskTitle) {
  const kinds = new Set(['learn', 'do', 'decide', 'review']);
  const out = [];
  (list || []).forEach((s) => {
    const title = String(typeof s === 'string' ? s : s?.title || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!title) return;
    if (title.toLowerCase() === String(taskTitle || '').trim().toLowerCase()) return;
    let minutes = Math.round(Number(s?.minutes));
    if (!Number.isFinite(minutes) || minutes <= 0) minutes = Math.min(15, maxSession);
    minutes = Math.max(5, Math.min(minutes, maxSession));
    const kind = kinds.has(s?.kind) ? s.kind : 'do';
    out.push({ title, minutes, kind });
  });
  if (out.length > 0) out[0].minutes = Math.min(out[0].minutes, 10); // an easy first step
  return out.slice(0, 8);
}

function fallbackSteps(title, maxSession) {
  const m = (n) => Math.min(n, maxSession);
  return [
    { title: `Write what you already know about ${title}`, minutes: m(8), kind: 'do' },
    { title: `Learn the core idea of ${title} with Compass`, minutes: m(15), kind: 'learn' },
    { title: 'Explain it back in your own words, 5 lines', minutes: m(15), kind: 'do' },
    { title: 'Check the result with Compass and fix one thing', minutes: m(10), kind: 'review' },
  ];
}

async function askModel(userPrompt) {
  const result = await Promise.race([
    model.invoke([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }]),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
  ]);
  return parseSteps(typeof result === 'string' ? result : result.content);
}

// info: { title, description, category, subject, difficulty, daysLeft, availableMinutes }
async function planSteps(info, maxSession) {
  const lines = [
    `Task: "${info.title}"`,
    info.description ? `Details: ${info.description}` : null,
    info.category ? `Category: ${info.category}` : null,
    info.subject ? `Subject: ${info.subject}` : null,
    info.difficulty ? `Difficulty: ${info.difficulty}` : null,
    `Time cap per step: ${maxSession} minutes.`,
    Number.isFinite(info.daysLeft) ? `Days until the deadline: ${info.daysLeft}.` : null,
    Number.isFinite(info.availableMinutes)
      ? `Free time available before the deadline: about ${info.availableMinutes} minutes. If the whole task would not fit, plan the most valuable steps that do.`
      : null,
    '',
    'Return the JSON array now.',
  ].filter((l) => l !== null);

  let steps = null;
  try {
    steps = cleanSteps(await askModel(lines.join('\n')), maxSession, info.title);
    const taskText = `${info.title} ${info.description || ''}`;
    const bad = steps.filter((s) => sendsOutside(s.title, taskText));
    if (bad.length > 0) {
      const retry = `${lines.join('\n')}\n\nYour last answer sent the user to outside material in these steps: ${bad.map((b) => `"${b.title}"`).join('; ')}. Rewrite the whole plan so Compass teaches or guides every step inside the app.`;
      steps = cleanSteps(await askModel(retry), maxSession, info.title);
    }
  } catch (e) {
    console.warn('planSteps failed, using fallback:', e.message);
  }
  if (!steps || steps.length < 2) return fallbackSteps(info.title, maxSession);

  // last line of defence: never ship an order to go and watch something
  const taskText = `${info.title} ${info.description || ''}`;
  return steps.map((s) => (sendsOutside(s.title, taskText) ? { ...s, title: `Work through this part with Compass: ${info.title}`.slice(0, 100) } : s));
}

// ---------------------------------------------------------------- scheduling
// The placement maths lives in scheduleCore.js (no database or model, so it is unit tested).
// scheduleSteps(steps, { today, nowHour, deadline, ...plan.schedOpts }) keeps the same call shape as before.

// ---------------------------------------------------------------- missed steps

/**
 * Re-plans every open task that has a missed step. A step is missed when it should have ended
 * a while ago and is not done. For each such task ALL its unfinished steps are placed again,
 * from now to the deadline, so their order is kept. Tasks with the earliest deadline go first,
 * so they get the best slots. Done steps are never touched.
 * Returns { moved, tasks: [{ taskId, title, moved, mode, overdue, pastDeadline }] }.
 */
async function rescheduleMissedForUser(userId, tz) {
  const now = time.nowInTz(tz);
  const nowHour = now.hour + now.minute / 60;

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status, due_date, metadata')
    .eq('user_id', userId)
    .neq('status', 'Completed')
    .neq('status', 'Cancelled');
  if (error) throw error;

  const affected = (data || []).filter(
    (t) => Array.isArray(t.metadata?.subtasks) && t.metadata.subtasks.some((s) => isMissedStep(s, now.iso, nowHour))
  );
  affected.sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));

  const results = [];
  for (const task of affected) {
    const subs = task.metadata.subtasks;
    const todo = subs.filter((s) => !s.done);
    // fresh context every time, so tasks re-planned a moment ago count as busy for the next one
    const plan = await getPlanningContext(userId, tz, { excludeTaskId: task.id });

    const dueRaw = String(task.due_date || '').slice(0, 10);
    const overdue = !!dueRaw && dueRaw < now.iso;
    const deadline = !dueRaw ? time.addDaysISO(now.iso, 7) : overdue ? now.iso : dueRaw;

    const sched = scheduleSteps(
      todo.map((s) => ({ title: s.title, minutes: Number(s.durationMins) || 15, kind: s.kind || 'do' })),
      { today: now.iso, nowHour, deadline, ...plan.schedOpts }
    );

    const stamp = new Date().toISOString();
    let k = 0;
    let moved = 0;
    const next = subs.map((s) => {
      if (s.done) return s;
      const it = sched.items[k++];
      const missed = isMissedStep(s, now.iso, nowHour);
      if (missed) moved += 1;
      return {
        ...s,
        scheduledDate: it.scheduledDate,
        scheduledHour: it.scheduledHour,
        durationMins: it.durationMins,
        rescheduledAt: stamp,
        rescheduledReason: missed ? 'missed' : 'replanned',
        rescheduleCount: (Number(s.rescheduleCount) || 0) + (missed ? 1 : 0),
      };
    });

    const { error: upErr } = await supabaseAdmin
      .from('tasks')
      .update({ metadata: { ...task.metadata, subtasks: next } })
      .eq('id', task.id)
      .eq('user_id', userId);
    if (upErr) throw upErr;

    results.push({ taskId: task.id, title: task.title, moved, mode: sched.mode, overdue, pastDeadline: sched.pastDeadline });
  }

  return { moved: results.reduce((sum, r) => sum + r.moved, 0), tasks: results };
}

module.exports = {
  getPlanningContext, getTaskWindow, planSteps, scheduleSteps, cleanSteps, fallbackSteps,
  estimateAvailableMinutes, describeSchedule, isMissedStep, rescheduleMissedForUser,
  DEFAULT_MAX_SESSION, BANNED, sendsOutside,
};

