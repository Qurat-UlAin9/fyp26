// backend/services/rewards/catalog.js
//
// What can be earned and unlocked in AIMS. Costs here are the ones the SERVER enforces.
// Keep ids and costs in sync with THEME_PRESETS / SOUND_PRESETS / TITLES in src/contexts/ThemeContext.js.

const EARN = { task: 5, subtask: 1, habit: 2 };
const MAX_GAME_COINS = 20;

const THEMES = [
  { id: 'vibrantLight', name: 'Vibrant Light', mode: 'light', cost: 0 },
  { id: 'sereneBlueDark', name: 'Serene Blue Dark', mode: 'dark', cost: 0 },
  { id: 'auroraLight', name: 'Aurora Light', mode: 'light', cost: 0 },
  { id: 'forestLight', name: 'Forest Light', mode: 'light', cost: 120 },
  { id: 'galaxyDark', name: 'Galaxy Dark', mode: 'dark', cost: 140 },
  { id: 'midnightDark', name: 'Midnight Dark', mode: 'dark', cost: 150 },
];

const SOUNDS = [
  { id: 'lofi_study', name: 'Lofi Study', genre: 'Lo-fi', cost: 0 },
  { id: 'classical_mountain', name: 'Classical Mountain', genre: 'Classical', cost: 40 },
  { id: 'night_drift', name: 'Night Drift', genre: 'Ambient', cost: 50 },
  { id: 'amity_fall', name: 'Amity Fall', genre: 'Ambient', cost: 60 },
  { id: 'mozart_andante', name: 'Mozart - Andante', genre: 'Classical', cost: 80 },
  { id: 'deep_focus_mountain', name: 'Deep Focus', genre: 'Ambient', cost: 100 },
];

// metric: which stat the badge looks at; target: value needed
const BADGES = [
  { id: 'first-step', name: 'First Step', description: 'Complete your first task', metric: 'tasksCompleted', target: 1 },
  { id: 'task-warrior', name: 'Task Warrior', description: 'Complete 10 tasks', metric: 'tasksCompleted', target: 10 },
  { id: 'task-master', name: 'Task Master', description: 'Complete 50 tasks', metric: 'tasksCompleted', target: 50 },
  { id: 'centurion', name: 'Centurion', description: 'Complete 100 tasks', metric: 'tasksCompleted', target: 100 },
  { id: 'warming-up', name: 'Warming Up', description: '3-day habit streak', metric: 'habitStreak', target: 3 },
  { id: 'consistency-king', name: 'Consistency King', description: '7-day habit streak', metric: 'habitStreak', target: 7 },
  { id: 'habit-master', name: 'Habit Master', description: '20 habit completions', metric: 'habitCompletions', target: 20 },
  { id: 'unstoppable', name: 'Unstoppable', description: '30-day habit streak', metric: 'habitStreak', target: 30 },
  { id: 'focus-beginner', name: 'Focus Beginner', description: '30 minutes of focus', metric: 'focusMinutes', target: 30 },
  { id: 'deep-work-legend', name: 'Deep Work', description: '300 minutes of focus', metric: 'focusMinutes', target: 300 },
  { id: 'monk-mode', name: 'Monk Mode', description: '1000 minutes of focus', metric: 'focusMinutes', target: 1000 },
];

const DEFAULT_THEMES = ['vibrantLight', 'sereneBlueDark', 'auroraLight'];
const DEFAULT_SOUNDS = ['lofi_study'];

// Find a theme or sound by id or (partial) name
function findItem(kind, key) {
  const list = kind === 'theme' ? THEMES : SOUNDS;
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  return (
    list.find((x) => x.id.toLowerCase() === k) ||
    list.find((x) => x.name.toLowerCase() === k) ||
    list.find((x) => x.name.toLowerCase().includes(k)) ||
    null
  );
}

module.exports = { EARN, MAX_GAME_COINS, THEMES, SOUNDS, BADGES, DEFAULT_THEMES, DEFAULT_SOUNDS, findItem };
