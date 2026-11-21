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

const DEFAULT_MAX_SESSION = 25; // minutes; the user's preferred focus length overrides it
const MIN_SESSION = 10;
const MAX_SESSION = 45;
const MAX_STEPS_PER_DAY = 3;
const MAX_MINUTES_PER_DAY = 90;
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 21; // last step must end by 22:00

const model = createChatModel({ temperature: 0.4, maxTokens: 700 });

// ---------------------------------------------------------------- planning context

async function getPlanningContext(userId, tz, { excludeTaskId = null } = {}) {
  const today = time.nowInTz(tz).iso;
  let maxSession = DEFAULT_MAX_SESSION;
  try {
    const { data } = await supabaseAdmin.from('adhd_profile').select('preferred_focus_length').eq('user_id', userId).maybeSingle();
    const n = Number(data?.preferred_focus_length);
    if (Number.isFinite(n) && n > 0) maxSession = Math.max(MIN_SESSION, Math.min(MAX_SESSION, Math.round(n)));
  } catch (_) { /* default */ }

  const preferredHour = await computePreferredWorkHour(userId);

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

  return { today, maxSession, preferredHour, busy };
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

const overlaps = (a, b) => a.start < b.end + 0.25 && b.start < a.end + 0.25; // 15 min breathing room

/**
 * steps: [{title, minutes, kind}]
 * opts: { today, nowHour, deadline, preferredHour, busy }
 * Returns { items: [{title, minutes, kind, scheduledDate, scheduledHour, durationMins}], tight, neededMinutes, capacityMinutes }
 */
function scheduleSteps(steps, opts) {
  const { today, nowHour = 9, deadline, preferredHour = 9, busy = [] } = opts;
  const n = steps.length;
  if (n === 0) return { items: [], tight: false, neededMinutes: 0, capacityMinutes: 0 };

  const startDay = nowHour <= 19 ? today : time.addDaysISO(today, 1);
  const daysToDeadline = time.diffDaysISO(startDay, deadline);
  // keep one spare day before the deadline when there is room for it
  const lastDay = daysToDeadline <= 1 ? (daysToDeadline < 0 ? startDay : deadline) : time.addDaysISO(deadline, -1);
  const dayCount = Math.max(1, Math.min(60, time.diffDaysISO(startDay, lastDay) + 1));
  const days = Array.from({ length: dayCount }, (_, i) => time.addDaysISO(startDay, i));

  const usage = new Map(days.map((d) => [d, { count: 0, minutes: 0, slots: [] }]));
  busy.forEach((b) => {
    const u = usage.get(b.date);
    if (u) {
      u.count += 1;
      u.minutes += b.minutes;
      u.slots.push({ start: b.hour, end: b.hour + b.minutes / 60 });
    }
  });

  const neededMinutes = steps.reduce((s, x) => s + x.minutes, 0);
  const capacityMinutes = days.reduce((sum, d) => {
    const u = usage.get(d);
    return sum + (u.count >= MAX_STEPS_PER_DAY ? 0 : Math.max(0, MAX_MINUTES_PER_DAY - u.minutes));
  }, 0);

  const hoursFor = (day, earliest) => {
    const first = Math.max(preferredHour, earliest);
    const list = [];
    for (let h = Math.ceil(first); h <= DAY_END_HOUR; h++) list.push(h);
    for (let h = Math.ceil(first) - 1; h >= Math.max(DAY_START_HOUR, Math.ceil(earliest)); h--) list.push(h);
    return list;
  };

  const tryPlace = (dayIdx, step, minHour) => {
    const day = days[dayIdx];
    const u = usage.get(day);
    if (u.count >= MAX_STEPS_PER_DAY || u.minutes + step.minutes > MAX_MINUTES_PER_DAY) return null;
    let earliest = Math.max(DAY_START_HOUR, minHour || 0);
    if (day === today) earliest = Math.max(earliest, Math.ceil(nowHour + 0.5));
    for (const h of hoursFor(day, earliest)) {
      const slot = { start: h, end: h + step.minutes / 60 };
      if (slot.end > DAY_END_HOUR + 1) continue;
      if (u.slots.some((s) => overlaps(slot, s))) continue;
      return { day, hour: h, slot };
    }
    return null;
  };

  let tight = neededMinutes > capacityMinutes;
  let prevIdx = 0;
  let prevEnd = 0;
  const items = steps.map((step, i) => {
    const target = Math.min(dayCount - 1, Math.floor((i * dayCount) / n));
    let from = Math.max(target, prevIdx);
    let placed = null;
    let idx = from;
    for (; idx < dayCount; idx++) {
      placed = tryPlace(idx, step, idx === prevIdx ? prevEnd + 0.25 : 0);
      if (placed) break;
    }
    if (!placed) {
      // no room anywhere ahead: put it on the last day at the first free hour and flag it
      tight = true;
      idx = dayCount - 1;
      const u = usage.get(days[idx]);
      let h = Math.max(preferredHour, idx === prevIdx ? Math.ceil(prevEnd + 0.25) : DAY_START_HOUR);
      while (h < DAY_END_HOUR && u.slots.some((s) => overlaps({ start: h, end: h + step.minutes / 60 }, s))) h += 1;
      placed = { day: days[idx], hour: h, slot: { start: h, end: h + step.minutes / 60 } };
    }
    const u = usage.get(placed.day);
    u.count += 1;
    u.minutes += step.minutes;
    u.slots.push(placed.slot);
    prevIdx = idx;
    prevEnd = placed.slot.end;
    return { ...step, scheduledDate: placed.day, scheduledHour: placed.hour, durationMins: step.minutes };
  });

  return { items, tight, neededMinutes, capacityMinutes };
}

module.exports = {
  getPlanningContext, planSteps, scheduleSteps, cleanSteps, fallbackSteps,
  DEFAULT_MAX_SESSION, BANNED, sendsOutside,
};
