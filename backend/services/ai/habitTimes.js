// backend/services/ai/habitTimes.js
//
// Habits keep their slot (Morning / Noon / Evening / Night) exactly as before, because completions,
// streaks and nudges are all indexed by slot. On top of that a habit can now have:
//   metadata.slotTimes    { Morning: "07:30" }  an exact clock time for a slot (optional)
//   metadata.durationMins 5..120                how long one check-in takes (default 10)
// With neither set, a habit behaves as before: a fixed default hour per slot, but only 10 minutes long.
// No dependencies, so it can be unit tested on its own.

const SLOT_DEFAULT_HOUR = { Morning: 7, Noon: 12, Evening: 18, Night: 21 };
const DEFAULT_HABIT_MINUTES = 10;
const pad = (n) => String(n).padStart(2, '0');

// "07:30" -> 7.5, anything invalid -> null
function parseHHMM(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

// 7.5 -> "07:30"
function formatHHMM(hour) {
  let h = Math.floor(hour + 1e-9);
  let m = Math.round((hour - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  return `${pad(h % 24)}:${pad(m)}`;
}

// Same cut-offs the app's nudges already use (slot ends at 11, 14, 20, 23)
function slotForHour(hour) {
  if (hour < 11) return 'Morning';
  if (hour < 14) return 'Noon';
  if (hour < 20) return 'Evening';
  return 'Night';
}

function habitMinutes(meta) {
  const n = Number(meta?.durationMins);
  return Number.isFinite(n) && n > 0 ? Math.min(120, Math.max(1, Math.round(n))) : DEFAULT_HABIT_MINUTES;
}

function habitStartHour(meta, slot) {
  const t = parseHHMM(meta?.slotTimes?.[slot]);
  if (t !== null) return t;
  return SLOT_DEFAULT_HOUR[slot] ?? null;
}

function endOfPlanISO(startedAt, targetDays) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(startedAt || ''));
  if (!m || !(Number(targetDays) > 0)) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + Number(targetDays)));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Recurring daily blocks the task scheduler must not place steps on.
 * rows: habits table rows { active, frequency, metadata }. Weekly habits are skipped (no fixed day).
 * Returns [{ start, end }] in hours, the same every day.
 */
function habitBlocksFromRows(rows, today) {
  const blocks = [];
  (rows || []).forEach((h) => {
    if (h.active === false) return;
    if (String(h.frequency || 'Daily') !== 'Daily') return;
    const meta = h.metadata || {};
    const end = endOfPlanISO(meta.startedAt, meta.targetDays);
    if (end && today && today >= end) return; // a finished N-day plan
    const slots = Array.isArray(meta.timeSlots) && meta.timeSlots.length ? meta.timeSlots : ['Morning'];
    const mins = habitMinutes(meta);
    slots.forEach((slot) => {
      const start = habitStartHour(meta, slot);
      if (start === null) return;
      blocks.push({ start, end: start + mins / 60 });
    });
  });
  return blocks;
}

module.exports = {
  SLOT_DEFAULT_HOUR,
  DEFAULT_HABIT_MINUTES,
  parseHHMM,
  formatHHMM,
  slotForHour,
  habitMinutes,
  habitStartHour,
  habitBlocksFromRows,
};
