// backend/services/ai/context/appState.js
//
// Coins, themes, music and badges live on the user's phone (ThemeContext), not in the
// database. The app sends a compact snapshot with every chat message. This file cleans it,
// turns it into a prompt block, and lists what the coach is allowed to know about AIMS.

const EARN_RULES = 'Coins: +5 for a finished task, +1 for a finished step, +2 for each habit tick, up to +20 for a brain game.';

const FEATURES = [
  'Tasks: tasks with auto-scheduled steps (subtasks), reminders, history.',
  'Habits: daily habits with time slots (morning/noon/evening/night) and streaks.',
  'Timeline: today\'s schedule of tasks, habits and focus sessions.',
  'Focus: focus timer with background music.',
  'Emotion Regulation: quick relief (Balloon breathing, Splash reset, Grounding 5-4-3-2-1, Harmonic Ripples, Guided Meditation, Soundscapes) and brain games (N-Back, Stroop, Pattern Recall, Rabbit Hunter, Tongue Twister).',
  'Rewards: coins, badges, themes and music to unlock.',
  'ADHD self-screening and Executive-function questionnaire (self-report, not a diagnosis); Reports; Profile; Settings.',
];

const clip = (v, n = 60) => String(v ?? '').slice(0, n);
const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : 0);
const list = (a, map) => (Array.isArray(a) ? a.slice(0, 30).map(map).filter(Boolean) : []);

function sanitizeAppState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  return {
    coins: num(raw.coins),
    stats: {
      tasksCompleted: num(stats.tasksCompleted),
      habitCompletions: num(stats.habitCompletions),
      habitStreak: num(stats.habitStreak),
      focusMinutes: num(stats.focusMinutes),
    },
    themes: list(raw.themes, (t) =>
      t && t.id
        ? { id: clip(t.id, 40), name: clip(t.name), mode: t.mode === 'dark' ? 'dark' : 'light', cost: num(t.cost), owned: !!t.owned, active: !!t.active }
        : null
    ),
    sounds: list(raw.sounds, (s) =>
      s && s.id
        ? { id: clip(s.id, 40), name: clip(s.name), genre: clip(s.genre, 30), cost: num(s.cost), owned: !!s.owned, active: !!s.active, playable: s.playable !== false }
        : null
    ),
    badges: list(raw.badges, (b) =>
      b && b.id
        ? { id: clip(b.id, 40), name: clip(b.name), description: clip(b.description, 80), unlocked: !!b.unlocked, pct: Math.min(100, num(b.pct)) }
        : null
    ),
    musicPlaying: !!raw.musicPlaying,
  };
}

// Only add the long catalog when the conversation is about the app / rewards
const APP_TOPIC = /\b(coin|coins|reward|rewards|theme|themes|song|songs|music|sound|sounds|track|tracks|badge|badges|achievement|achievements|unlock|unlocked|buy|purchase|streak|points|app|feature|features|section|screen|play|dark mode|light mode)\b/i;

function wantsFullApp(message, history = []) {
  const recentUser = (history || []).filter((m) => m.sender === 'user').slice(-2).map((m) => m.message);
  return [message, ...recentUser].some((t) => APP_TOPIC.test(String(t || '')));
}

function formatAppBlock(state, full) {
  if (!state) return '';
  const unlocked = state.badges.filter((b) => b.unlocked).length;
  const activeTheme = state.themes.find((t) => t.active);
  const activeSound = state.sounds.find((s) => s.active);
  const affordable = [
    ...state.themes.filter((t) => !t.owned && t.cost > 0 && t.cost <= state.coins).map((t) => `${t.name} (theme, ${t.cost})`),
    ...state.sounds.filter((s) => !s.owned && s.playable && s.cost > 0 && s.cost <= state.coins).map((s) => `${s.name} (music, ${s.cost})`),
  ];
  const closest = state.badges
    .filter((b) => !b.unlocked)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)
    .map((b) => `${b.name} ${b.pct}% (${b.description})`);

  let block = '\n\nAIMS APP STATE (live from the user\'s phone; trust it):\n';
  block += `- Coins: ${state.coins}. Badges: ${unlocked}/${state.badges.length} unlocked. Focus minutes: ${state.stats.focusMinutes}.\n`;
  if (activeTheme) block += `- Theme in use: ${activeTheme.name}.\n`;
  if (activeSound) block += `- Music selected: ${activeSound.name}${state.musicPlaying ? ' (playing now)' : ''}.\n`;
  if (closest.length) block += `- Closest badges: ${closest.join('; ')}.\n`;
  block += `- Can afford right now: ${affordable.length ? affordable.join(', ') : 'nothing new yet'}.\n`;

  if (full) {
    block += `\n${EARN_RULES}\n`;
    block += 'Themes: ' + state.themes.map((t) => `${t.name} [id ${t.id}, ${t.mode}, ${t.cost ? t.cost + ' coins' : 'free'}${t.owned ? ', owned' : ', locked'}]`).join('; ') + '\n';
    block += 'Music: ' + state.sounds.map((s) => `${s.name} [id ${s.id}, ${s.genre}, ${s.cost ? s.cost + ' coins' : 'free'}${s.owned ? ', owned' : ', locked'}${s.playable ? '' : ', audio not available yet'}]`).join('; ') + '\n';
    block += 'Badges: ' + state.badges.map((b) => `${b.name} (${b.description}) ${b.unlocked ? 'UNLOCKED' : b.pct + '%'}`).join('; ') + '\n';
    block += 'What AIMS has:\n' + FEATURES.map((f) => `- ${f}`).join('\n') + '\n';
  }
  return block;
}

module.exports = { sanitizeAppState, formatAppBlock, wantsFullApp, EARN_RULES };
