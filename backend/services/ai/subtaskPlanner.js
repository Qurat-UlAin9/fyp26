// backend/services/ai/subtaskPlanner.js
//
// Turns a task into a plan the user can actually follow:
//   1. planSteps():     small steps, each with a time cap (the user's focus length) and a purpose.
//                       Steps are done WITH the coach, never "go watch a tutorial".
//   2. scheduleSteps(): places the steps on real days and hours, around the steps the user already
//                       has, with a limit per day and a buffer day before the deadline.
// Dates, hours and limits are decided in code. The model only writes the step wording.

const { createChatModel, textOf } = require('./llmProvider');
const { supabaseAdmin } = require('../../config/supabase');
const time = require('./context/timeContext');
const { computePreferredWorkHour } = require('./subtaskScheduler');
const core = require('./scheduleCore');
const { habitBlocksFromRows } = require('./habitTimes');

const { scheduleSteps, estimateAvailableMinutes, describeSchedule, isMissedStep } = core;

const DEFAULT_MAX_SESSION = 25; // minutes; the user's preferred focus length overrides it
const MIN_SESSION = 10;
const MAX_SESSION = 45;

const model = createChatModel({ temperature: 0.4, maxTokens: 1100, purpose: 'tasks' });

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
//
// planTask() is the task planner. It does NOT use the research library (RAG): that only holds ADHD and
// wellbeing material. The model writes the plan from its own general knowledge, shaped by the TYPE of task:
//   understand  a topic to learn: sub-topics in the order they must be met, each named, with explain-back checks
//   do          something to make or finish: gather what is needed first (ingredients, tools), then each action
//   mixed       understand first, then make something with it

const BANNED = /\b(watch|youtube|videos?|tutorials?|google|research|look up|browse|wikipedia)\b|\bread\b[^.]*\b(blog|article|paper|chapter|docs?|documentation|post|book)\b|\bsearch\b[^.]*\b(online|web|internet)\b/i;

// A step is only "outside material" if the task itself did not ask for that (e.g. "read chapter 3")
function sendsOutside(stepTitle, taskText) {
  const m = String(stepTitle).match(BANNED);
  if (!m) return false;
  const word = m[0].toLowerCase().split(/\s+/)[0];
  return !String(taskText || '').toLowerCase().includes(word);
}

const SYSTEM_PROMPT = `You plan a task for someone with ADHD. The user does every step TOGETHER with their AI coach (Compass) inside the AIMS app, one step per sitting.

First decide the TASK TYPE:
- "understand": the user wants to learn, study, revise or understand something (a topic, a chapter, a concept, an exam subject).
- "do": the user wants to make or finish something practical (cook a dish, clean a room, write an email, fix or build something, pack a bag, organise files).
- "mixed": they must understand something and then produce something with it (a report, essay, presentation, project).

Return ONLY one JSON object, no markdown, in exactly this shape:
{"taskType": "understand" | "do" | "mixed",
 "materials": [string],
 "steps": [{"title": string, "detail": string, "minutes": number, "kind": "prepare" | "learn" | "do" | "decide" | "review"}]}

Rules for every plan:
- Think about how big and hard the task really is, then choose 3 to 8 steps. A bigger or harder task gets MORE steps, never longer ones.
- Every step must fit inside the time cap you are given (minutes <= cap). Use the real time a step needs: 5 to 10 for tiny or easy steps, up to the cap for the hardest.
- The first step must be very easy to start (10 minutes or less) and give a quick win.
- "title": imperative, at most 12 words, uses the real subject words from the task, says the exact output. No vague verbs like "research", "work on", "prepare", "plan". Do not repeat the task title as a step.
- "detail": ONE or TWO short sentences saying exactly what happens in this step.
- The coach is the helper. Never send the user to outside material: no watching videos or tutorials, no reading articles, blogs, papers or docs, no searching the web, unless the task itself names that exact resource.
- Order the steps in the sequence they should happen. The last step is a short review or finish line.

Rules for "understand":
- Break the subject into its real SUB-TOPICS, in the order someone must meet them (what comes first is what the next one builds on). Name each sub-topic specifically, for example "Learn Newton's second law with Compass", never "Learn the basics".
- Each sub-topic is a step of kind "learn", titled "Learn <specific sub-topic> with Compass". Its "detail" says what that sub-topic covers.
- After every two or three "learn" steps add one "do" step where the user proves it: explain it back in their own words, answer 3 questions, or solve one small problem. End with a "review" step.
- "materials" is an empty list.

Rules for "do":
- The FIRST step has kind "prepare" and gathers everything needed. Its "detail" lists the items with quantities when that makes sense (for a dish: every ingredient with an amount for 2 servings unless the task says otherwise, plus the tools). Put the same items in "materials", one string per item.
- Then every action in the order it really happens, kind "do". Its "detail" is the concrete action: what to do, for how long, and what it should look or feel like when it is right.
- The last step is kind "review": check the result, then tidy up, serve or send.
- Do not skip the small steps a beginner would forget.

Rules for "mixed": the "understand" steps first, then the "do" steps for what must be produced. Fill "materials" only when physical items are needed.`;

const KINDS = new Set(['prepare', 'learn', 'do', 'decide', 'review']);
const TYPES = new Set(['understand', 'do', 'mixed']);

function parsePlan(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const tryParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
  let parsed = tryParse(text);
  if (!parsed) {
    const obj = text.match(/\{[\s\S]*\}/);
    parsed = obj ? tryParse(obj[0]) : null;
  }
  if (!parsed) {
    const arr = text.match(/\[[\s\S]*\]/);
    parsed = arr ? tryParse(arr[0]) : null;
  }
  if (Array.isArray(parsed)) return { taskType: 'mixed', materials: [], steps: parsed }; // old answer shape
  if (parsed && Array.isArray(parsed.steps)) return parsed;
  return null;
}

function cleanSteps(list, maxSession, taskTitle) {
  const out = [];
  (list || []).forEach((s) => {
    const title = String(typeof s === 'string' ? s : s?.title || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!title) return;
    if (title.toLowerCase() === String(taskTitle || '').trim().toLowerCase()) return;
    let minutes = Math.round(Number(s?.minutes));
    if (!Number.isFinite(minutes) || minutes <= 0) minutes = Math.min(15, maxSession);
    minutes = Math.max(5, Math.min(minutes, maxSession));
    const kind = KINDS.has(s?.kind) ? s.kind : 'do';
    const detail = typeof s === 'object' && s?.detail ? String(s.detail).replace(/\s+/g, ' ').trim().slice(0, 240) : '';
    out.push({ title, minutes, kind, ...(detail ? { detail } : {}) });
  });
  if (out.length > 0) out[0].minutes = Math.min(out[0].minutes, 10); // an easy first step
  return out.slice(0, 9);
}

function cleanPlan(plan, maxSession, taskTitle) {
  const taskType = TYPES.has(plan?.taskType) ? plan.taskType : 'mixed';
  const materials = (Array.isArray(plan?.materials) ? plan.materials : [])
    .map((m) => String(m || '').replace(/\s+/g, ' ').trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 20);
  let steps = cleanSteps(plan?.steps, maxSession, taskTitle);

  // A "do" task always starts by gathering what is needed, even if the model forgot that step
  if (taskType !== 'understand' && materials.length > 0 && !steps.some((s) => s.kind === 'prepare')) {
    steps = [
      { title: 'Gather what you need', minutes: Math.min(10, maxSession), kind: 'prepare', detail: materials.join(', ').slice(0, 240) },
      ...steps,
    ].slice(0, 9);
  }
  return { taskType, materials, steps };
}

function guessType(title) {
  const t = String(title || '').toLowerCase();
  if (/^(learn|understand|study|revise|revision|master|explain|review)\b/.test(t)) return 'understand';
  if (/\b(cook|make|bake|clean|organi[sz]e|pack|fix|build|assemble|wash|buy|repair|tidy|decorate|send|book)\b/.test(t)) return 'do';
  return 'mixed';
}

function fallbackPlan(title, maxSession) {
  const m = (n) => Math.min(n, maxSession);
  const type = guessType(title);
  if (type === 'understand') {
    return {
      taskType: 'understand',
      materials: [],
      steps: [
        { title: `Write what you already know about ${title}`, minutes: m(8), kind: 'do', detail: 'Five lines is enough. This shows where to start.' },
        { title: `Learn the core idea of ${title} with Compass`, minutes: m(15), kind: 'learn', detail: 'What it is and why it matters, in plain words.' },
        { title: `Learn how ${title} works, stage by stage, with Compass`, minutes: m(15), kind: 'learn', detail: 'The main parts in the order they happen.' },
        { title: 'Explain it back in your own words, 5 lines', minutes: m(15), kind: 'do', detail: 'If a part is hard to say, that is the part to revisit.' },
        { title: 'Check the result with Compass and fix one thing', minutes: m(10), kind: 'review', detail: 'Compass checks your explanation and points out one gap.' },
      ],
    };
  }
  if (type === 'do') {
    return {
      taskType: 'do',
      materials: [],
      steps: [
        { title: `Gather what you need for ${title}`, minutes: m(10), kind: 'prepare', detail: 'Make a list of the items and tools, then put them within reach.' },
        { title: `Do the first part of ${title}`, minutes: m(15), kind: 'do', detail: 'Start with the easiest piece and stop when it is done.' },
        { title: `Finish ${title}`, minutes: m(15), kind: 'do', detail: 'Complete the remaining part.' },
        { title: 'Check the result and tidy up', minutes: m(10), kind: 'review', detail: 'Look at it once with fresh eyes and fix one thing.' },
      ],
    };
  }
  return {
    taskType: 'mixed',
    materials: [],
    steps: [
      { title: `Write what you already know about ${title}`, minutes: m(8), kind: 'do', detail: 'Five lines is enough.' },
      { title: `Learn the core idea of ${title} with Compass`, minutes: m(15), kind: 'learn', detail: 'What it is and why it matters.' },
      { title: 'Explain it back in your own words, 5 lines', minutes: m(15), kind: 'do', detail: 'Say it simply, as if to a friend.' },
      { title: 'Check the result with Compass and fix one thing', minutes: m(10), kind: 'review', detail: 'Compass points out one gap to fix.' },
    ],
  };
}

async function askModel(userPrompt) {
  const result = await Promise.race([
    model.invoke([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }]),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
  ]);
  return parsePlan(textOf(typeof result === 'string' ? result : result.content));
}

// info: { title, description, category, subject, difficulty, daysLeft, availableMinutes }
// returns { taskType: 'understand'|'do'|'mixed', materials: string[], steps: [{ title, detail?, minutes, kind }] }
async function planTask(info, maxSession) {
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
    'Return the JSON object now.',
  ].filter((l) => l !== null);

  const taskText = `${info.title} ${info.description || ''}`;
  let plan = null;
  try {
    plan = cleanPlan(await askModel(lines.join('\n')), maxSession, info.title);
    const bad = plan.steps.filter((s) => sendsOutside(s.title, taskText));
    if (bad.length > 0) {
      const retry = `${lines.join('\n')}\n\nYour last answer sent the user to outside material in these steps: ${bad.map((b) => `"${b.title}"`).join('; ')}. Rewrite the whole plan so Compass teaches or guides every step inside the app.`;
      plan = cleanPlan(await askModel(retry), maxSession, info.title);
    }
  } catch (e) {
    console.warn('planTask failed, using fallback:', e.message);
  }
  if (!plan || plan.steps.length < 2) return fallbackPlan(info.title, maxSession);

  // last line of defence: never ship an order to go and watch something
  return {
    ...plan,
    steps: plan.steps.map((s) => (sendsOutside(s.title, taskText) ? { ...s, title: `Work through this part with Compass: ${info.title}`.slice(0, 100) } : s)),
  };
}

// The old name still works for callers that only need the list of steps
async function planSteps(info, maxSession) {
  return (await planTask(info, maxSession)).steps;
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
  getPlanningContext, getTaskWindow, planTask, planSteps, scheduleSteps, cleanSteps, fallbackPlan,
  estimateAvailableMinutes, describeSchedule, isMissedStep, rescheduleMissedForUser,
  DEFAULT_MAX_SESSION, BANNED, sendsOutside,
};

