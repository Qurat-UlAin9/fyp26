// backend/services/ai/subtaskScheduler.js
//
// Spreads subtasks evenly across the days between today and a deadline.
// Also exposes a helper to read the user's preferred work hour from
// their focus session history.

const { supabaseAdmin } = require('../../config/supabase');

const DEFAULT_HOUR = 9;
const DEFAULT_DURATION = 30;
const LOOKBACK_DAYS = 30;

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function diffDays(fromISO, toISO) {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.floor(ms / 86400000);
}

/**
 * Even spread. Last subtask always lands on the deadline day.
 * If deadline is today or in the past, all subtasks go on today.
 */
function scheduleSubtasks(subtasks, deadlineISO, opts = {}) {
  const {
    preferredHour = DEFAULT_HOUR,
    durationMins = DEFAULT_DURATION,
    today = toISODate(new Date()),
  } = opts;

  if (!Array.isArray(subtasks) || subtasks.length === 0) return [];

  const deadlineMs = new Date(deadlineISO).getTime();
  const todayMs = new Date(today).getTime();
  const n = subtasks.length;

  const titles = subtasks.map((s) =>
    typeof s === 'string' ? s : String(s.title || s)
  );

  // Deadline today or past: stack on today
  if (isNaN(deadlineMs) || deadlineMs <= todayMs) {
    return titles.map((title) => ({
      title,
      scheduledDate: today,
      scheduledHour: preferredHour,
      durationMins,
    }));
  }

  const totalDays = diffDays(today, deadlineISO);

  return titles.map((title, i) => {
    const dayOffset =
      n === 1 ? totalDays : Math.round(((i + 1) * totalDays) / n);
    const clamped = Math.max(1, Math.min(dayOffset, totalDays));
    const schedDate = addDays(today, clamped);
    return {
      title,
      scheduledDate: toISODate(schedDate),
      scheduledHour: preferredHour,
      durationMins,
    };
  });
}

/**
 * Reads the last 30 days of completed focus sessions and returns the hour
 * of day where the user accumulates the most focus time. Falls back to 9am.
 */
async function computePreferredWorkHour(userId) {
  if (!userId) return DEFAULT_HOUR;

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from('focus_sessions')
      .select('started_at, actual_minutes, status')
      .eq('user_id', userId)
      .eq('status', 'Completed')
      .gte('started_at', since);

    if (error || !data || data.length === 0) return DEFAULT_HOUR;

    const buckets = {};
    for (const s of data) {
      if (!s.started_at) continue;
      const h = new Date(s.started_at).getHours();
      const weight = Math.max(1, s.actual_minutes || 1);
      buckets[h] = (buckets[h] || 0) + weight;
    }

    const entries = Object.entries(buckets);
    if (entries.length === 0) return DEFAULT_HOUR;

    entries.sort((a, b) => b[1] - a[1]);
    const topHour = parseInt(entries[0][0], 10);

    // Clamp to working hours 6am - 10pm
    return Math.max(6, Math.min(22, topHour));
  } catch (e) {
    console.warn('computePreferredWorkHour failed:', e.message);
    return DEFAULT_HOUR;
  }
}

module.exports = {
  scheduleSubtasks,
  computePreferredWorkHour,
  DEFAULT_HOUR,
  DEFAULT_DURATION,
};