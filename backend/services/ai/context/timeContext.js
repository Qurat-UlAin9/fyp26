// backend/services/ai/context/timeContext.js
//
// The model cannot know today's date, so it guessed ("coming Monday" became 31 January).
// Dates are decided here, in code: the user's timezone, a calendar block for the prompt,
// and a resolver that turns "monday", "tomorrow", "in 3 days" or "Dec 5" into YYYY-MM-DD.

const { supabaseAdmin } = require('../../../config/supabase');

const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || 'Asia/Karachi';
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

function validTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (_) {
    return false;
  }
}

const tzCache = new Map(); // userId -> { tz, at }

async function getUserTimezone(userId) {
  const hit = tzCache.get(userId);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.tz;
  let tz = DEFAULT_TZ;
  try {
    const { data } = await supabaseAdmin.from('profiles').select('timezone').eq('user_id', userId).maybeSingle();
    if (data?.timezone && validTz(data.timezone)) tz = data.timezone;
  } catch (_) { /* keep default */ }
  tzCache.set(userId, { tz, at: Date.now() });
  return tz;
}

// Save the timezone the phone reports (so the server and the phone agree on "today" and "now")
async function rememberUserTimezone(userId, tz) {
  if (!validTz(tz)) return;
  const hit = tzCache.get(userId);
  if (hit && hit.tz === tz) return;
  tzCache.set(userId, { tz, at: Date.now() });
  try {
    await supabaseAdmin.from('profiles').update({ timezone: tz }).eq('user_id', userId);
  } catch (_) { /* not critical */ }
}

// Current date/time as seen by someone in `tz`
function nowInTz(tz = DEFAULT_TZ, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const hour = get('hour') % 24;
  const minute = get('minute');
  return { iso: `${y}-${pad(m)}-${pad(d)}`, hour, minute, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

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

function weekdayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isRealISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// "Mon 23 Nov" / "Today" / "Tomorrow"
function friendlyDate(iso, today) {
  if (iso === today) return 'Today';
  if (iso === addDaysISO(today, 1)) return 'Tomorrow';
  const [, m, d] = iso.split('-').map(Number);
  return `${WD_SHORT[weekdayOf(iso)]} ${d} ${MON_SHORT[m - 1]}`;
}

function friendlyTime(hour) {
  const h = Math.floor(hour);
  const mm = Math.round((hour - h) * 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(mm)} ${ap}`;
}

// Prompt block: today, plus the next 14 days so the model never does date arithmetic
function formatDateBlock(tz = DEFAULT_TZ, now = new Date()) {
  const t = nowInTz(tz, now);
  const [y, m, d] = t.iso.split('-').map(Number);
  const days = [];
  for (let i = 0; i < 14; i++) {
    const iso = addDaysISO(t.iso, i);
    const [, mm, dd] = iso.split('-').map(Number);
    days.push(`${WD_SHORT[weekdayOf(iso)]} ${dd} ${MON_SHORT[mm - 1]}${i === 0 ? ' (today)' : ''} = ${iso}`);
  }
  return (
    '\n\nCURRENT DATE AND TIME (the user\'s own timezone; trust this over anything else):\n' +
    `Today is ${WEEKDAYS[t.weekday][0].toUpperCase() + WEEKDAYS[t.weekday].slice(1)} ${d} ${MON_SHORT[m - 1]} ${y}, ${pad(t.hour)}:${pad(t.minute)} (${tz}).\n` +
    `Next 14 days: ${days.join(' | ')}.\n` +
    'Use these exact dates. "Coming Monday" or "next Monday" means the first Monday after today. ' +
    'When a tool needs a date, pass YYYY-MM-DD, and read dates back to the user exactly as the tool reports them.\n'
  );
}

// Turn what the model or user wrote into YYYY-MM-DD in the user's timezone, or null
function resolveDueDate(input, tz = DEFAULT_TZ, now = new Date()) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;
  if (/\b(last|ago|yesterday|previous)\b/.test(raw)) return null; // a past date is never a due date
  const today = nowInTz(tz, now);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isRealISO(raw) ? raw : null;
  if (raw === 'today' || raw === 'tonight') return today.iso;
  if (/^(tomorrow|tmrw|tmr)$/.test(raw)) return addDaysISO(today.iso, 1);
  if (/day after tomorrow/.test(raw)) return addDaysISO(today.iso, 2);

  let m = raw.match(/\bin\s+(\d{1,3})\s*(day|days|week|weeks)\b/);
  if (m) return addDaysISO(today.iso, Number(m[1]) * (m[2].startsWith('week') ? 7 : 1));

  if (/^(next week)$/.test(raw)) {
    const delta = ((1 - today.weekday + 7) % 7) || 7;
    return addDaysISO(today.iso, delta);
  }
  if (/end of (the )?month/.test(raw)) {
    const [y, mo] = today.iso.split('-').map(Number);
    const last = new Date(Date.UTC(y, mo, 0));
    return `${last.getUTCFullYear()}-${pad(last.getUTCMonth() + 1)}-${pad(last.getUTCDate())}`;
  }

  // weekday names: monday, mon, next monday, this friday, coming sunday
  m = raw.match(/\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|sday|nesday|rsday|urday)?\b/);
  if (m) {
    const target = WEEKDAYS.findIndex((w) => w.startsWith(m[1].slice(0, 3)));
    if (target >= 0) {
      let delta = (target - today.weekday + 7) % 7;
      if (delta === 0) delta = 7; // "monday" said on a Monday means the next one
      return addDaysISO(today.iso, delta);
    }
  }

  // "Dec 5", "december 5th 2026", "5 dec"
  const monthIdx = (s) => MONTHS.findIndex((mn) => mn.startsWith(s.slice(0, 3)));
  let day; let mon; let year;
  m = raw.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/);
  if (m) { mon = monthIdx(m[1]); day = Number(m[2]); year = m[3] ? Number(m[3]) : null; }
  if (mon === undefined) {
    m = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:,?\s*(\d{4}))?/);
    if (m) { day = Number(m[1]); mon = monthIdx(m[2]); year = m[3] ? Number(m[3]) : null; }
  }
  if (mon !== undefined && mon >= 0 && day) {
    const thisYear = Number(today.iso.slice(0, 4));
    let iso = `${year || thisYear}-${pad(mon + 1)}-${pad(day)}`;
    if (!year && isRealISO(iso) && iso < today.iso) iso = `${thisYear + 1}-${pad(mon + 1)}-${pad(day)}`;
    return isRealISO(iso) ? iso : null;
  }
  return null;
}

module.exports = {
  DEFAULT_TZ, getUserTimezone, rememberUserTimezone, validTz, nowInTz, addDaysISO, diffDaysISO, weekdayOf, isRealISO,
  friendlyDate, friendlyTime, formatDateBlock, resolveDueDate,
};
