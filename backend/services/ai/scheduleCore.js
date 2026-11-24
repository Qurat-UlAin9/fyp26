// backend/services/ai/scheduleCore.js
//
// The scheduling maths, with no database or model dependencies (so it can be unit tested).
// The model never picks dates or hours; this file does.
//
// Rules:
//  - Steps go inside the user's task window (default 6 PM - 10 PM) on a 15 minute grid.
//  - Habits are fixed points: steps never overlap them. Other tasks' steps are not overlapped either.
//  - Per day: at most 3 steps and 90 minutes (more only when the deadline forces it).
//  - A spare day before the deadline is kept when there is room for it.
//  - If the work does not fit, the system relaxes in stages and says which stage it reached:
//      normal      fits with the spare day and the normal daily limits
//      stretched   uses the spare day and slightly heavier days
//      extended    also uses time outside the user's window (8 AM - 11 PM)
//      overloaded  does not fit at all; steps are stacked on the last day and the shortfall is reported

const DEFAULT_WINDOW_START = 18;
const DEFAULT_WINDOW_END = 22;
const EXT_WINDOW_START = 8;
const EXT_WINDOW_END = 23;
const GRID = 0.25; // 15 minutes
const GAP = 0.25; // breathing room between two blocks
const MAX_STEPS_PER_DAY = 3;
const MAX_MINUTES_PER_DAY = 90;
const STRETCH_EXTRA_MINUTES = 60;
const STRETCH_EXTRA_STEPS = 1;
const FRONT_LOAD = 0.85; // pull steps slightly earlier so the last days are not crammed
const MISSED_GRACE_HOURS = 2; // a step is "missed" only this long after it was supposed to end
const MIN_STEP_MINUTES = 5;

const pad = (n) => String(n).padStart(2, '0');

function addDaysISO(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

function diffDaysISO(fromISO, toISO) {
  const f = fromISO.split('-').map(Number);
  const t = toISO.split('-').map(Number);
  return Math.round((Date.UTC(t[0], t[1] - 1, t[2]) - Date.UTC(f[0], f[1] - 1, f[2])) / 86400000);
}

const ceilGrid = (x) => Math.ceil(x / GRID - 1e-9) * GRID;
const overlaps = (a, b) => a.start < b.end + GAP && b.start < a.end + GAP;

function clockLabel(hour) {
  const total = Math.round(hour * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ap}`;
}

function normalizeWindow(start, end) {
  let s = Number(start);
  let e = Number(end);
  const ok = start != null && end != null && Number.isFinite(s) && Number.isFinite(e) && s >= 0 && e <= 24 && e - s >= 0.5;
  if (!ok) { s = DEFAULT_WINDOW_START; e = DEFAULT_WINDOW_END; }
  return { start: s, end: e };
}

function normalizeOpts(opts = {}) {
  const win = normalizeWindow(opts.windowStart, opts.windowEnd);
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.today)) ? opts.today : new Date().toISOString().slice(0, 10);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.deadline)) ? opts.deadline : addDaysISO(today, 7);
  return {
    today,
    deadline,
    nowHour: Number.isFinite(Number(opts.nowHour)) ? Number(opts.nowHour) : 9,
    preferredHour: Number.isFinite(Number(opts.preferredHour)) ? Number(opts.preferredHour) : win.start,
    busy: Array.isArray(opts.busy) ? opts.busy : [],
    habitBlocks: Array.isArray(opts.habitBlocks) ? opts.habitBlocks : [],
    windowStart: win.start,
    windowEnd: win.end,
    maxMinutes: Number(opts.maxMinutesPerDay) > 0 ? Number(opts.maxMinutesPerDay) : MAX_MINUTES_PER_DAY,
    maxSteps: MAX_STEPS_PER_DAY,
  };
}

function buildPasses(o) {
  const win = { start: o.windowStart, end: o.windowEnd };
  const ext = { start: Math.min(EXT_WINDOW_START, win.start), end: Math.max(EXT_WINDOW_END, win.end) };
  return [
    { name: 'normal', win, buffer: true, force: false, maxMinutes: o.maxMinutes, maxSteps: o.maxSteps },
    { name: 'stretched', win, buffer: false, force: false, maxMinutes: o.maxMinutes + STRETCH_EXTRA_MINUTES, maxSteps: o.maxSteps + STRETCH_EXTRA_STEPS },
    { name: 'extended', win: ext, buffer: false, force: true, maxMinutes: o.maxMinutes + STRETCH_EXTRA_MINUTES, maxSteps: o.maxSteps + STRETCH_EXTRA_STEPS + 1 },
  ];
}

function buildDays(pass, o) {
  const todayOpen = o.nowHour + 0.5 <= pass.win.end - GRID;
  const startDay = todayOpen ? o.today : addDaysISO(o.today, 1);
  const daysToDeadline = diffDaysISO(startDay, o.deadline);
  let lastDay = pass.buffer && daysToDeadline >= 2 ? addDaysISO(o.deadline, -1) : o.deadline;
  if (diffDaysISO(startDay, lastDay) < 0) {
    if (!pass.force) return [];
    lastDay = startDay; // the deadline cannot be met; still give the steps a home
  }
  const count = Math.max(1, Math.min(60, diffDaysISO(startDay, lastDay) + 1));
  return Array.from({ length: count }, (_, i) => addDaysISO(startDay, i));
}

function makeModel(pass, o) {
  const days = buildDays(pass, o);
  const usage = new Map(days.map((d) => [d, { count: 0, minutes: 0, slots: [] }]));
  o.busy.forEach((b) => {
    const u = usage.get(b.date);
    if (!u) return;
    const hour = Number(b.hour);
    const minutes = Number(b.minutes) || 30;
    u.count += 1;
    u.minutes += minutes;
    if (Number.isFinite(hour)) u.slots.push({ start: hour, end: hour + minutes / 60 });
  });
  return { days, usage };
}

// Rough free minutes for the days of a model (an estimate used for messages and for the planner prompt)
function capacityOf(model, pass, o) {
  let total = 0;
  model.days.forEach((d) => {
    const u = model.usage.get(d);
    if (u.count >= pass.maxSteps) return;
    const startAt = Math.max(pass.win.start, d === o.today ? ceilGrid(o.nowHour + 0.5) : 0);
    let free = Math.max(0, (pass.win.end - startAt) * 60);
    [...u.slots, ...o.habitBlocks].forEach((b) => {
      const s = Math.max(b.start, startAt);
      const e = Math.min(b.end, pass.win.end);
      if (e > s) free -= (e - s) * 60;
    });
    total += Math.max(0, Math.min(pass.maxMinutes - u.minutes, free));
  });
  return Math.round(total);
}

// Place the steps in order. Returns the placed items, or null when something does not fit.
// With pass.stack set it never fails: whatever does not fit is stacked at the end of the last day.
function placeAll(steps, model, pass, o) {
  const { days, usage } = model;
  const n = steps.length;
  const dayCount = days.length;
  if (dayCount === 0) return null;

  const tryPlace = (k, step, minStart) => {
    const day = days[k];
    const u = usage.get(day);
    if (u.count >= pass.maxSteps || u.minutes + step.minutes > pass.maxMinutes) return null;
    const dur = step.minutes / 60;
    let earliest = Math.max(pass.win.start, minStart);
    if (day === o.today) earliest = Math.max(earliest, ceilGrid(o.nowHour + 0.5));
    earliest = ceilGrid(earliest);
    const latest = Math.floor((pass.win.end - dur) / GRID + 1e-9) * GRID; // last start on the grid that still ends inside the window
    if (latest < earliest - 1e-9) return null;
    const anchor = Math.min(Math.max(ceilGrid(o.preferredHour), earliest), latest);
    const candidates = [];
    for (let t = anchor; t <= latest + 1e-9; t += GRID) candidates.push(t);
    for (let t = anchor - GRID; t >= earliest - 1e-9; t -= GRID) candidates.push(t);
    for (const t of candidates) {
      const slot = { start: t, end: t + dur };
      if (u.slots.some((s) => overlaps(slot, s))) continue;
      if (o.habitBlocks.some((b) => overlaps(slot, b))) continue;
      return { day, hour: t, slot };
    }
    return null;
  };

  const items = [];
  let prevIdx = 0;
  let prevEnd = 0;
  for (let i = 0; i < n; i++) {
    const step = steps[i];
    const target = Math.min(dayCount - 1, Math.floor((i * FRONT_LOAD * dayCount) / n));
    const from = Math.max(target, prevIdx);
    let placed = null;
    let idx = -1;
    for (let k = from; k < dayCount && !placed; k++) {
      placed = tryPlace(k, step, k === prevIdx ? prevEnd + GAP : 0);
      if (placed) idx = k;
    }
    for (let k = prevIdx; k < from && !placed; k++) {
      placed = tryPlace(k, step, k === prevIdx ? prevEnd + GAP : 0);
      if (placed) idx = k;
    }
    if (!placed) {
      if (!pass.stack) return null;
      idx = dayCount - 1;
      const dur = step.minutes / 60;
      const t = Math.max(pass.win.start, Math.floor((pass.win.end - dur) / GRID + 1e-9) * GRID);
      placed = { day: days[idx], hour: t, slot: { start: t, end: t + dur } };
    }
    const u = usage.get(placed.day);
    u.count += 1;
    u.minutes += step.minutes;
    u.slots.push(placed.slot);
    prevIdx = idx;
    prevEnd = placed.slot.end;
    items.push({ ...step, scheduledDate: placed.day, scheduledHour: placed.hour, durationMins: step.minutes });
  }
  return items;
}

/**
 * steps: [{ title, minutes, kind }]
 * opts: { today, nowHour, deadline, preferredHour, busy:[{date,hour,minutes}], habitBlocks:[{start,end}],
 *         windowStart, windowEnd, maxMinutesPerDay }
 * Returns { items, tight, mode, neededMinutes, capacityMinutes, shortfallMinutes, window, pastDeadline }
 */
function scheduleSteps(steps, opts = {}) {
  const o = normalizeOpts(opts);
  const win = { start: o.windowStart, end: o.windowEnd };
  const list = Array.isArray(steps) ? steps : [];
  if (list.length === 0) {
    return { items: [], tight: false, mode: 'normal', neededMinutes: 0, capacityMinutes: 0, shortfallMinutes: 0, window: win, pastDeadline: false };
  }

  // a step can never be longer than the user's window
  const maxStepMin = Math.floor((o.windowEnd - o.windowStart) * 60);
  const adj = list.map((s) => ({
    ...s,
    minutes: Math.max(MIN_STEP_MINUTES, Math.min(Math.round(Number(s.minutes)) || 15, maxStepMin)),
  }));
  const neededMinutes = adj.reduce((sum, s) => sum + s.minutes, 0);

  const passes = buildPasses(o);
  const capacityMinutes = capacityOf(makeModel(passes[0], o), passes[0], o);

  let mode = null;
  let items = null;
  for (const pass of passes) {
    const placed = placeAll(adj, makeModel(pass, o), pass, o);
    if (placed) { mode = pass.name; items = placed; break; }
  }

  let shortfallMinutes = 0;
  if (!items) {
    const ext = passes[2];
    const relaxed = { ...ext, maxMinutes: 24 * 60, maxSteps: 99, stack: true };
    items = placeAll(adj, makeModel(relaxed, o), relaxed, o);
    mode = 'overloaded';
    shortfallMinutes = Math.max(0, neededMinutes - capacityOf(makeModel(ext, o), ext, o));
  }

  const pastDeadline = items.some((it) => it.scheduledDate > o.deadline);
  return { items, tight: mode !== 'normal', mode, neededMinutes, capacityMinutes, shortfallMinutes, window: win, pastDeadline };
}

// Free minutes before the deadline, for telling the planner how many steps are realistic
function estimateAvailableMinutes(opts = {}) {
  const o = normalizeOpts(opts);
  for (const pass of buildPasses(o)) {
    const cap = capacityOf(makeModel(pass, o), pass, o);
    if (cap > 0) return cap;
  }
  return 0;
}

// Text the coach reads back to the user when the plan is not comfortable. '' when everything is fine.
function describeSchedule(sched, { deadline } = {}) {
  if (!sched || sched.mode === 'normal') return '';
  const w = `${clockLabel(sched.window.start)}-${clockLabel(sched.window.end % 24)}`;
  const need = `about ${sched.neededMinutes} min of work`;
  const options = 'Offer these options: a later deadline, fewer or shorter steps, or a longer daily time window.';
  const late = sched.pastDeadline ? ' Some steps land after the deadline, so say that plainly.' : '';
  if (sched.mode === 'stretched') {
    return `\nHEADS UP: this is a little tight. The steps fill most of the user's ${w} slot each day and use the spare day before the deadline. Say so honestly.${late}`;
  }
  if (sched.mode === 'extended') {
    return `\nHEADS UP: this did not fit inside the user's usual ${w} slot (${need}, only about ${sched.capacityMinutes} min free there before ${deadline || 'the deadline'}), so some steps are placed outside it. Say so honestly. ${options}${late}`;
  }
  return `\nHEADS UP: this does NOT fit. ${need}, but even with extra hours there is a shortfall of about ${sched.shortfallMinutes} min, so some steps are stacked on the last day. Be honest that the deadline is unrealistic as set. ${options}${late}`;
}

// A step is missed once it should have ended a while ago and is still not done
function isMissedStep(step, today, nowHour) {
  if (!step || step.done || !step.scheduledDate) return false;
  if (step.scheduledDate < today) return true;
  if (step.scheduledDate > today) return false;
  const h = Number(step.scheduledHour);
  if (!Number.isFinite(h)) return false;
  const end = h + (Number(step.durationMins) || 30) / 60;
  return end + MISSED_GRACE_HOURS <= nowHour;
}

module.exports = {
  DEFAULT_WINDOW_START,
  DEFAULT_WINDOW_END,
  MAX_MINUTES_PER_DAY,
  MISSED_GRACE_HOURS,
  normalizeWindow,
  scheduleSteps,
  estimateAvailableMinutes,
  describeSchedule,
  isMissedStep,
};
