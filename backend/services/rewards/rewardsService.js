// backend/services/rewards/rewardsService.js
//
// Coins, unlocked themes/music, selected items and reward stats, kept on the server.
// Used by the /api/rewards routes (the app) and by the coach's tools.

const { supabaseAdmin } = require('../../config/supabase');
const {
  EARN, MAX_GAME_COINS, THEMES, SOUNDS, BADGES, DEFAULT_THEMES, DEFAULT_SOUNDS, findItem,
} = require('./catalog');

const dayISO = (offset = 0) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const int = (v, max = 1000000000) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};

// Longest habit streak that is still alive (finished today or yesterday)
async function bestHabitStreak(userId) {
  const { data, error } = await supabaseAdmin
    .from('habits').select('metadata').eq('user_id', userId).eq('active', true);
  if (error || !data) return 0;
  const today = dayISO(0);
  const yesterday = dayISO(1);
  return data.reduce((max, h) => {
    const last = h.metadata?.lastCompletionDate;
    const alive = last === today || last === yesterday;
    return alive ? Math.max(max, int(h.metadata?.streak)) : max;
  }, 0);
}

function toState(row, habitStreak = 0) {
  return {
    coins: row.coins,
    stats: {
      tasksCompleted: row.tasks_completed,
      subtasksCompleted: row.subtasks_completed,
      habitCompletions: row.habit_completions,
      focusMinutes: row.focus_minutes,
      habitStreak,
    },
    unlockedThemes: row.unlocked_themes || DEFAULT_THEMES,
    unlockedSounds: row.unlocked_sounds || DEFAULT_SOUNDS,
    selectedThemeId: row.selected_theme_id,
    selectedSoundId: row.selected_sound_id || null,
    featuredBadgeId: row.featured_badge_id || null,
    celebratedBadges: row.celebrated_badges || [],
    imported: !!row.imported,
  };
}

async function getRow(userId) {
  const { data, error } = await supabaseAdmin.from('user_rewards').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) return { row: data, created: false };

  const { data: created, error: insErr } = await supabaseAdmin
    .from('user_rewards').insert({ user_id: userId }).select('*').single();
  if (insErr) {
    // two requests created it at the same time: read the winner
    const { data: again } = await supabaseAdmin.from('user_rewards').select('*').eq('user_id', userId).maybeSingle();
    if (again) return { row: again, created: false };
    throw insErr;
  }
  return { row: created, created: true };
}

async function save(userId, patch, tx) {
  const { data, error } = await supabaseAdmin
    .from('user_rewards')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  if (tx && tx.amount) {
    const r = await supabaseAdmin.from('coin_transactions').insert({
      user_id: userId, amount: tx.amount, reason: tx.reason, ref: tx.ref || null, balance_after: data.coins,
    });
    if (r?.error) console.warn('[rewards] coin_transactions insert failed:', r.error.message);
  }
  return data;
}

async function getState(userId) {
  const { row, created } = await getRow(userId);
  return { state: toState(row, await bestHabitStreak(userId)), created };
}

// kind: task | subtask | habit | game | focus
async function applyEvent(userId, { kind, undo = false, amount = 0, minutes = 0 }) {
  const { row } = await getRow(userId);
  const patch = {};
  let delta = 0;

  if (EARN[kind]) {
    delta = undo ? -EARN[kind] : EARN[kind];
    const col = { task: 'tasks_completed', subtask: 'subtasks_completed', habit: 'habit_completions' }[kind];
    patch[col] = Math.max(0, row[col] + (undo ? -1 : 1));
  } else if (kind === 'game') {
    if (undo) return { state: toState(row, await bestHabitStreak(userId)), delta: 0 };
    delta = Math.min(int(amount), MAX_GAME_COINS);
  } else if (kind === 'focus') {
    patch.focus_minutes = row.focus_minutes + Math.min(int(minutes), 600);
  } else {
    throw new Error(`Unknown reward event: ${kind}`);
  }

  const newCoins = Math.max(0, row.coins + delta);
  const actual = newCoins - row.coins;
  patch.coins = newCoins;
  const saved = await save(userId, patch, { amount: actual, reason: undo ? `undo:${kind}` : kind });
  return { state: toState(saved, await bestHabitStreak(userId)), delta: actual };
}

async function unlock(userId, kind, id) {
  const item = findItem(kind, id);
  if (!item) return { ok: false, reason: `Unknown ${kind}` };
  const { row } = await getRow(userId);
  const col = kind === 'theme' ? 'unlocked_themes' : 'unlocked_sounds';
  const owned = row[col] || [];
  if (owned.includes(item.id)) return { ok: true, item, already: true, state: toState(row, await bestHabitStreak(userId)) };
  if (row.coins < item.cost) return { ok: false, reason: 'Not enough coins', item, state: toState(row, await bestHabitStreak(userId)) };

  const saved = await save(
    userId,
    { coins: row.coins - item.cost, [col]: [...owned, item.id] },
    { amount: -item.cost, reason: `unlock:${kind}:${item.id}` }
  );
  return { ok: true, item, state: toState(saved, await bestHabitStreak(userId)) };
}

async function select(userId, kind, id) {
  const item = findItem(kind, id);
  if (!item) return { ok: false, reason: `Unknown ${kind}` };
  const { row } = await getRow(userId);
  const owned = (kind === 'theme' ? row.unlocked_themes : row.unlocked_sounds) || [];
  if (!owned.includes(item.id)) return { ok: false, reason: 'Locked', item, state: toState(row, await bestHabitStreak(userId)) };
  const saved = await save(userId, kind === 'theme' ? { selected_theme_id: item.id } : { selected_sound_id: item.id });
  return { ok: true, item, state: toState(saved, await bestHabitStreak(userId)) };
}

async function setFeatured(userId, badgeId) {
  if (badgeId && !BADGES.some((b) => b.id === badgeId)) return { ok: false, reason: 'Unknown badge' };
  await getRow(userId);
  const saved = await save(userId, { featured_badge_id: badgeId || null });
  return { ok: true, state: toState(saved, await bestHabitStreak(userId)) };
}

async function markCelebrated(userId, ids) {
  const { row } = await getRow(userId);
  const valid = (Array.isArray(ids) ? ids : []).filter((id) => BADGES.some((b) => b.id === id));
  const merged = [...new Set([...(row.celebrated_badges || []), ...valid])];
  const saved = await save(userId, { celebrated_badges: merged });
  return { ok: true, state: toState(saved, await bestHabitStreak(userId)) };
}

// One-time copy of the rewards the phone had before they moved to the server
async function importLocal(userId, local = {}) {
  const { row } = await getRow(userId);
  if (row.imported) return { ok: true, state: toState(row, await bestHabitStreak(userId)), skipped: true };

  const themes = new Set([...DEFAULT_THEMES, ...(Array.isArray(local.unlockedThemes) ? local.unlockedThemes : [])].filter((id) => THEMES.some((t) => t.id === id)));
  const sounds = new Set([...DEFAULT_SOUNDS, ...(Array.isArray(local.unlockedSounds) ? local.unlockedSounds : [])].filter((id) => SOUNDS.some((s) => s.id === id)));
  const stats = local.stats && typeof local.stats === 'object' ? local.stats : {};
  const coins = int(local.coins, 100000);

  const patch = {
    coins,
    tasks_completed: int(stats.tasksCompleted, 1000000),
    subtasks_completed: int(stats.subtasksCompleted, 1000000),
    habit_completions: int(stats.habitCompletions, 1000000),
    focus_minutes: int(stats.focusMinutes, 10000000),
    unlocked_themes: [...themes],
    unlocked_sounds: [...sounds],
    selected_theme_id: themes.has(local.selectedThemeId) ? local.selectedThemeId : 'vibrantLight',
    selected_sound_id: sounds.has(local.selectedSoundId) ? local.selectedSoundId : null,
    featured_badge_id: BADGES.some((b) => b.id === local.featuredBadgeId) ? local.featuredBadgeId : null,
    celebrated_badges: (Array.isArray(local.celebratedBadges) ? local.celebratedBadges : []).filter((id) => BADGES.some((b) => b.id === id)),
    imported: true,
  };
  const saved = await save(userId, patch, { amount: coins, reason: 'import' });
  return { ok: true, state: toState(saved, await bestHabitStreak(userId)) };
}

// Shape used by the coach's prompt block (see context/appState.js)
async function getAppState(userId) {
  const { state } = await getState(userId);
  return {
    coins: state.coins,
    stats: state.stats,
    themes: THEMES.map((t) => ({ ...t, owned: state.unlockedThemes.includes(t.id), active: state.selectedThemeId === t.id })),
    sounds: SOUNDS.map((s) => ({ ...s, owned: state.unlockedSounds.includes(s.id), active: state.selectedSoundId === s.id, playable: true })),
    badges: BADGES.map((b) => {
      const value = state.stats[b.metric] || 0;
      return { id: b.id, name: b.name, description: b.description, unlocked: value >= b.target, pct: Math.min(100, Math.round((value / b.target) * 100)) };
    }),
    musicPlaying: false,
  };
}

module.exports = { getState, applyEvent, unlock, select, setFeatured, markCelebrated, importLocal, getAppState };
