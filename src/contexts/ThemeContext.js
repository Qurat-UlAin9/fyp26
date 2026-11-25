import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalAudio, playTrack, toggle as toggleGlobalAudio, getAudioState } from '../services/audioPlayer';
import {
  fetchRewards, importRewards, sendRewardEvent, unlockRewardApi, selectRewardApi,
  setFeaturedBadgeApi, markBadgesCelebratedApi,
} from '../services/api';

const STORAGE_KEY = 'app_rewards_theme_state_v3';

// Music tracks unlocked via Rewards. Keys are stable IDs referenced
// from SOUND_PRESETS below.
export const SOUND_LIBRARY = {
  lofi_study: require('../../assets/sounds/music/lofi_study.mp3'),
  mozart_andante: require('../../assets/sounds/music/mozart_andante.mp3'),
  classical_mountain: require('../../assets/sounds/music/classical_mountain.mp3'),
  night_drift: require('../../assets/sounds/music/night_drift.mp3'),
  amity_fall: require('../../assets/sounds/music/amity_fall.mp3'),
  deep_focus_mountain: require('../../assets/sounds/music/deep_focus_mountain.mp3'),
};

// One yellow for every coin, so the balance pill, the coin fly-up and the rewards screen match.
export const COIN_COLORS = { fill: '#FACC15', deep: '#CA8A04', soft: '#FEF08A', text: '#713F12' };

const THEME_PRESETS = {
  vibrantLight: {
    id: 'vibrantLight', name: 'Vibrant Light', mode: 'light', cost: 0,
    background: ['#E9F6FF', '#FFF4EA', '#FFFFFF'], card: 'rgba(255,255,255,0.78)',
    text: '#0F172A', textSecondary: '#475569', accentGradient: ['#8B5CF6', '#22D3EE'],
    border: 'rgba(99,102,241,0.22)', glow: '#8B5CF6', tabGradient: ['#FFFFFF', '#EEF2FF'],
    quoteImage: 'https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=1400&q=80',
    surface: '#FFFFFF', sheetGradient: ['#F8FAFF','#EEF2FF'],
    cards: [['#FF6B7A', '#FF8FA3'], ['#4DA6FF', '#7EC8FF'], ['#3ECFA0', '#6EECC0'], ['#9B7FE8', '#C4AAFF'], ['#2EC4B6', '#5EEADC']],
  },
  sereneBlueDark: {
    id: 'sereneBlueDark', name: 'Serene Blue Dark', mode: 'dark', cost: 0,
    background: ['#070B22', '#0A1A46', '#0C2C70'], card: 'rgba(11, 19, 52, 0.72)',
    text: '#E2E8F0', textSecondary: '#BFDBFE', accentGradient: ['#60A5FA', '#22D3EE'],
    border: 'rgba(125,211,252,0.3)', glow: '#38BDF8', tabGradient: ['#081330', '#11204E'],
    quoteImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80',
    surface: '#0F1B40', sheetGradient: ['#12224F','#0D1838'],
    cards: [['#2563EB', '#38BDF8'], ['#0EA5E9', '#22D3EE'], ['#4F46E5', '#60A5FA'], ['#0891B2', '#2DD4BF'], ['#3B82F6', '#818CF8']],
  },
  auroraLight: {
    id: 'auroraLight', name: 'Aurora Light', mode: 'light', cost: 0,
    background: ['#F3FFFB', '#E6FFF4', '#ECFEFF'], card: 'rgba(243,255,251,0.92)',
    text: '#0B3B33', textSecondary: '#2F6D61', accentGradient: ['#10B981', '#06B6D4'],
    border: 'rgba(16,185,129,0.24)', glow: '#10B981', tabGradient: ['#D1FAE5', '#CFFAFE'],
    quoteImage: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1400&q=80',
    surface: '#F7FFFC', sheetGradient: ['#ECFDF5','#F0FDFA'],
    cards: [['#10B981', '#06B6D4'], ['#14B8A6', '#22D3EE'], ['#34D399', '#84CC16'], ['#0EA5E9', '#2DD4BF'], ['#059669', '#34D399']],
  },
  forestLight: {
    id: 'forestLight', name: 'Forest Light', mode: 'light', cost: 120,
    background: ['#eef9ee', '#f9f5eb', '#ffffff'], card: 'rgba(238, 248, 236, 0.7)',
    text: '#1f3d24', textSecondary: '#3f5c43', accentGradient: ['#84cc16', '#22c55e'],
    border: 'rgba(74, 124, 89, 0.2)', glow: '#65a30d', tabGradient: ['#eff9ef', '#f8f3e7'],
    quoteImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80',
    surface: '#F7FBF3', sheetGradient: ['#F1F8EC','#F8F5E8'],
    cards: [['#65A30D', '#22C55E'], ['#15803D', '#4ADE80'], ['#CA8A04', '#A3E635'], ['#0F766E', '#34D399'], ['#92400E', '#D97706']],
  },
  galaxyDark: {
    id: 'galaxyDark', name: 'Galaxy Dark', mode: 'dark', cost: 140,
    background: ['#120026', '#1d0f45', '#08112f'], card: 'rgba(18, 22, 54, 0.58)',
    text: '#f8fafc', textSecondary: '#c4b5fd', accentGradient: ['#6366f1', '#22d3ee'],
    border: 'rgba(129,140,248,0.3)', glow: '#60a5fa', tabGradient: ['#11183b', '#1a1352'],
    quoteImage: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80',
    surface: '#1A1440', sheetGradient: ['#1F1850','#150F36'],
    cards: [['#6366F1', '#A78BFA'], ['#7C3AED', '#EC4899'], ['#4F46E5', '#22D3EE'], ['#9333EA', '#F472B6'], ['#2563EB', '#8B5CF6']],
  },
  midnightDark: {
    id: 'midnightDark', name: 'Midnight Dark', mode: 'dark', cost: 150,
    background: ['#050505', '#111827', '#1f2937'], card: 'rgba(23, 23, 23, 0.75)',
    text: '#f8fafc', textSecondary: '#d1d5db', accentGradient: ['#a16207', '#facc15'],
    border: 'rgba(250,204,21,0.22)', glow: '#fcd34d', tabGradient: ['#0f0f10', '#1f2932'],
    quoteImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80',
    surface: '#1A1A1C', sheetGradient: ['#1F1F22','#141416'],
    cards: [['#A16207', '#FACC15'], ['#B45309', '#FBBF24'], ['#52525B', '#A1A1AA'], ['#854D0E', '#F59E0B'], ['#3F3F46', '#FDE047']],
  },
};

const TITLES = [
  { id: 'first-step', name: 'First Step', icon: '👣',
    description: 'Complete your first task',
    condition: (s) => s.tasksCompleted >= 1,
    progress: (s) => s.tasksCompleted / 1 },
  { id: 'task-warrior', name: 'Task Warrior', icon: '⚔️',
    description: 'Complete 10 tasks',
    condition: (s) => s.tasksCompleted >= 10,
    progress: (s) => s.tasksCompleted / 10 },
  { id: 'task-master', name: 'Task Master', icon: '✅',
    description: 'Complete 50 tasks',
    condition: (s) => s.tasksCompleted >= 50,
    progress: (s) => s.tasksCompleted / 50 },
  { id: 'centurion', name: 'Centurion', icon: '💯',
    description: 'Complete 100 tasks',
    condition: (s) => s.tasksCompleted >= 100,
    progress: (s) => s.tasksCompleted / 100 },
  { id: 'warming-up', name: 'Warming Up', icon: '🔥',
    description: '3-day habit streak',
    condition: (s) => s.habitStreak >= 3,
    progress: (s) => s.habitStreak / 3 },
  { id: 'consistency-king', name: 'Consistency King', icon: '⚡',
    description: '7-day habit streak',
    condition: (s) => s.habitStreak >= 7,
    progress: (s) => s.habitStreak / 7 },
  { id: 'habit-master', name: 'Habit Master', icon: '🌱',
    description: '20 habit completions',
    condition: (s) => s.habitCompletions >= 20,
    progress: (s) => s.habitCompletions / 20 },
  { id: 'unstoppable', name: 'Unstoppable', icon: '🏆',
    description: '30-day habit streak',
    condition: (s) => s.habitStreak >= 30,
    progress: (s) => s.habitStreak / 30 },
  { id: 'focus-beginner', name: 'Focus Beginner', icon: '🧠',
    description: '30 minutes of focus',
    condition: (s) => s.focusMinutes >= 30,
    progress: (s) => s.focusMinutes / 30 },
  { id: 'deep-work-legend', name: 'Deep Work', icon: '🌌',
    description: '300 minutes of focus',
    condition: (s) => s.focusMinutes >= 300,
    progress: (s) => s.focusMinutes / 300 },
  { id: 'monk-mode', name: 'Monk Mode', icon: '🧘',
    description: '1000 minutes of focus',
    condition: (s) => s.focusMinutes >= 1000,
    progress: (s) => s.focusMinutes / 1000 },
];

// Music presets — replace the old ambient sounds.
export const SOUND_PRESETS = [
  { id: 'lofi_study', name: 'Lofi Study', artist: 'Zephira Music', cost: 0, genre: 'Lo-fi' },
  { id: 'classical_mountain', name: 'Classical Mountain', artist: 'The Mountain', cost: 40, genre: 'Classical' },
  { id: 'night_drift', name: 'Night Drift', artist: 'Two Times', cost: 50, genre: 'Ambient' },
  { id: 'amity_fall', name: 'Amity Fall', artist: 'Sonder House', cost: 60, genre: 'Ambient' },
  { id: 'mozart_andante', name: 'Mozart — Andante', artist: 'Nesrality', cost: 80, genre: 'Classical' },
  { id: 'deep_focus_mountain', name: 'Deep Focus', artist: 'The Mountain', cost: 100, genre: 'Ambient' },
];

const ThemeContext = createContext(null);

const defaultState = {
  coins: 0,
  selectedThemeId: 'vibrantLight',
  unlockedThemes: ['vibrantLight', 'sereneBlueDark', 'auroraLight'],
  selectedSoundId: null,
  unlockedSounds: ['lofi_study'],   // Lo-fi Study is free by default
  featuredBadgeId: null,            // Badge shown on profile — locked by default
  celebratedBadges: [],             // badges whose confetti was already shown
  ownerEmail: null,                 // whose rewards this phone copy belongs to
  stats: { tasksCompleted: 0, subtasksCompleted: 0, habitCompletions: 0, habitStreak: 0, focusMinutes: 0 },
};

export const ThemeProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);
  // Playback is global (src/services/audioPlayer.js); this just says whether the selected reward track is the one playing
  const globalAudio = useGlobalAudio();
  const [hydrated, setHydrated] = useState(false); // saved rewards loaded from the phone
  const [rewardsSynced, setRewardsSynced] = useState(false); // rewards loaded from the server at least once
  const stateRef = useRef(defaultState);
  stateRef.current = state;
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setState((p) => ({ ...p, ...JSON.parse(raw) })))
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state]);

  // ------ SERVER SYNC ------
  // The server (user_rewards table) is the source of truth. Screens still update the phone copy
  // right away so the app feels instant, then the server's answer replaces it.

  // habitStreak is NOT taken from the server: it is derived from the habits (syncHabitStreak)
  const applyServerState = useCallback((srv) => {
    if (!srv) return;
    setState((prev) => ({
      ...prev,
      coins: srv.coins,
      unlockedThemes: srv.unlockedThemes,
      unlockedSounds: srv.unlockedSounds,
      selectedThemeId: srv.selectedThemeId || prev.selectedThemeId,
      selectedSoundId: srv.selectedSoundId ?? null,
      featuredBadgeId: srv.featuredBadgeId ?? null,
      celebratedBadges: srv.celebratedBadges || [],
      stats: {
        ...prev.stats,
        tasksCompleted: srv.stats.tasksCompleted,
        subtasksCompleted: srv.stats.subtasksCompleted,
        habitCompletions: srv.stats.habitCompletions,
        focusMinutes: srv.stats.focusMinutes,
      },
    }));
  }, []);

  // Server calls run one after another, so "unlock" always lands before "select"
  const serverCall = useCallback((fn) => {
    queueRef.current = queueRef.current
      .then(fn)
      .then((res) => applyServerState(res?.data?.state))
      .catch((e) => console.warn('[rewards] server sync failed:', e?.message || e));
  }, [applyServerState]);

  // Load rewards from the server. The first time, the phone's old local rewards are copied up
  // (only if they belong to this account), so nothing the user already earned is lost.
  const refreshRewards = useCallback(async (email) => {
    try {
      const res = await fetchRewards();
      let srv = res?.data?.state;
      if (!srv) return false;
      const local = stateRef.current;
      if (!srv.imported) {
        const mine = !local.ownerEmail || !email || local.ownerEmail === email;
        const payload = mine
          ? {
              coins: local.coins,
              stats: local.stats,
              unlockedThemes: local.unlockedThemes,
              unlockedSounds: local.unlockedSounds,
              selectedThemeId: local.selectedThemeId,
              selectedSoundId: local.selectedSoundId,
              featuredBadgeId: local.featuredBadgeId,
              celebratedBadges: local.celebratedBadges,
            }
          : {};
        const imp = await importRewards(payload);
        srv = imp?.data?.state || srv;
      }
      applyServerState(srv);
      if (email) setState((p) => (p.ownerEmail === email ? p : { ...p, ownerEmail: email }));
      setRewardsSynced(true);
      return true;
    } catch (e) {
      console.warn('[rewards] could not load from server:', e?.message || e);
      return false;
    }
  }, [applyServerState]);

  const spendCoins = useCallback((amount) => {
    if (state.coins < amount) return false;
    setState((prev) => ({ ...prev, coins: prev.coins - amount }));
    return true;
  }, [state.coins]);

  const earnCoinsLocal = useCallback(
    (amount) => amount && setState((prev) => ({ ...prev, coins: prev.coins + amount })),
    []
  );

  // Coins from a brain game (the server caps this at 20)
  const earnCoins = useCallback((amount) => {
    if (!amount || amount <= 0) return;
    earnCoinsLocal(amount);
    serverCall(() => sendRewardEvent({ kind: 'game', amount }));
  }, [earnCoinsLocal, serverCall]);

  const loseCoins = useCallback((amount) => {
    if (!amount || amount <= 0) return;
    setState((prev) => ({ ...prev, coins: Math.max(0, prev.coins - amount) }));
  }, []);

  const unlockTheme = useCallback((id) => {
    if (state.unlockedThemes.includes(id)) return { ok: true };
    const preset = THEME_PRESETS[id];
    if (!preset) return { ok: false, reason: 'Theme not found' };
    if (!spendCoins(preset.cost)) return { ok: false, reason: 'Not enough coins' };
    setState((prev) => ({ ...prev, unlockedThemes: [...prev.unlockedThemes, id] }));
    serverCall(() => unlockRewardApi('theme', id));
    return { ok: true };
  }, [spendCoins, state.unlockedThemes, serverCall]);

  const selectTheme = useCallback(
    (id) => {
      setState((prev) => (prev.unlockedThemes.includes(id) ? { ...prev, selectedThemeId: id } : prev));
      serverCall(() => selectRewardApi('theme', id));
    },
    [serverCall]
  );

  const unlockSound = useCallback((id) => {
    if (state.unlockedSounds.includes(id)) return { ok: true };
    const preset = SOUND_PRESETS.find((item) => item.id === id);
    if (!preset) return { ok: false, reason: 'Sound not found' };
    if (!spendCoins(preset.cost)) return { ok: false, reason: 'Not enough coins' };
    setState((prev) => ({ ...prev, unlockedSounds: [...prev.unlockedSounds, id] }));
    serverCall(() => unlockRewardApi('sound', id));
    return { ok: true };
  }, [spendCoins, state.unlockedSounds, serverCall]);

  const selectSound = useCallback(
    (id) => {
      setState((prev) => (prev.unlockedSounds.includes(id) ? { ...prev, selectedSoundId: id } : prev));
      serverCall(() => selectRewardApi('sound', id));
    },
    [serverCall]
  );

  const selectedTrackId = state.selectedSoundId ? `music:${state.selectedSoundId}` : null;
  const isSoundPlaying = Boolean(selectedTrackId) && globalAudio.isPlaying && globalAudio.track?.id === selectedTrackId;

  // Play / pause the selected reward track on the shared player (keeps playing when leaving the screen)
  const toggleSoundPlayback = useCallback(async () => {
    const id = state.selectedSoundId;
    if (!id || !SOUND_LIBRARY[id]) return;
    const current = getAudioState();
    if (current.track?.id === `music:${id}`) {
      toggleGlobalAudio();
      return;
    }
    const preset = SOUND_PRESETS.find((p) => p.id === id);
    await playTrack({
      id: `music:${id}`,
      title: preset?.name || 'Music',
      subtitle: preset?.artist || '',
      source: SOUND_LIBRARY[id],
      kind: 'music',
      volume: 0.5,
    });
  }, [state.selectedSoundId]);

  // ------ STAT REGISTRATION (the server awards the coins: task 5, step 1, habit 2) ------

  const registerTaskCompletion = useCallback(() => {
    earnCoinsLocal(5);
    setState((prev) => ({
      ...prev,
      stats: { ...prev.stats, tasksCompleted: prev.stats.tasksCompleted + 1 },
    }));
    serverCall(() => sendRewardEvent({ kind: 'task' }));
  }, [earnCoinsLocal, serverCall]);

  const unregisterTaskCompletion = useCallback(() => {
    loseCoins(5);
    setState((prev) => ({
      ...prev,
      stats: { ...prev.stats, tasksCompleted: Math.max(0, prev.stats.tasksCompleted - 1) },
    }));
    serverCall(() => sendRewardEvent({ kind: 'task', undo: true }));
  }, [loseCoins, serverCall]);

  const registerSubtaskCompletion = useCallback(() => {
    earnCoinsLocal(1);
    setState((prev) => ({
      ...prev,
      stats: { ...prev.stats, subtasksCompleted: prev.stats.subtasksCompleted + 1 },
    }));
    serverCall(() => sendRewardEvent({ kind: 'subtask' }));
  }, [earnCoinsLocal, serverCall]);

  const unregisterSubtaskCompletion = useCallback(() => {
    loseCoins(1);
    setState((prev) => ({
      ...prev,
      stats: { ...prev.stats, subtasksCompleted: Math.max(0, prev.stats.subtasksCompleted - 1) },
    }));
    serverCall(() => sendRewardEvent({ kind: 'subtask', undo: true }));
  }, [loseCoins, serverCall]);

  const registerHabitCompletion = useCallback(() => {
    earnCoinsLocal(2);
    setState((prev) => ({
      ...prev,
      stats: { ...prev.stats, habitCompletions: prev.stats.habitCompletions + 1 },
    }));
    serverCall(() => sendRewardEvent({ kind: 'habit' }));
  }, [earnCoinsLocal, serverCall]);

  const unregisterHabitCompletion = useCallback(() => {
    loseCoins(2);
    setState((prev) => ({
      ...prev,
      stats: { ...prev.stats, habitCompletions: Math.max(0, prev.stats.habitCompletions - 1) },
    }));
    serverCall(() => sendRewardEvent({ kind: 'habit', undo: true }));
  }, [loseCoins, serverCall]);

  // The real streak = the longest CURRENT streak among the user's habits (kept in the habits data).
  const syncHabitStreak = useCallback((days) => {
    const n = Math.max(0, Math.floor(Number(days) || 0));
    setState((prev) => (prev.stats.habitStreak === n ? prev : { ...prev, stats: { ...prev.stats, habitStreak: n } }));
  }, []);

  const addFocusMinutes = useCallback(
    (minutes) => {
      if (!minutes) return;
      setState((prev) => ({
        ...prev,
        stats: { ...prev.stats, focusMinutes: prev.stats.focusMinutes + minutes },
      }));
      serverCall(() => sendRewardEvent({ kind: 'focus', minutes }));
    },
    [serverCall]
  );

  // Remember which badge confetti was shown (also on the server, so a new phone does not repeat it)
  const markCelebrated = useCallback((ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    setState((prev) => ({ ...prev, celebratedBadges: [...new Set([...(prev.celebratedBadges || []), ...ids])] }));
    serverCall(() => markBadgesCelebratedApi(ids));
  }, [serverCall]);

  const resetThemeData = useCallback(() => setState(defaultState), []);

  // Featured badge: only settable if unlocked
  const setFeaturedBadge = useCallback((badgeId) => {
    setState((prev) => ({ ...prev, featuredBadgeId: badgeId || null }));
    serverCall(() => setFeaturedBadgeApi(badgeId || null));
  }, [serverCall]);

  const titles = useMemo(
    () =>
      TITLES.map((item) => {
        const unlocked = item.condition(state.stats);
        const raw = item.progress ? item.progress(state.stats) : (unlocked ? 1 : 0);
        return {
          ...item,
          unlocked,
          progress: Math.max(0, Math.min(1, raw)),
        };
      }),
    [state.stats]
  );

  const theme = THEME_PRESETS[state.selectedThemeId] || THEME_PRESETS.vibrantLight;

  const value = useMemo(
    () => ({
      theme,
      colors: theme,
      isDark: theme.mode === 'dark',
      themes: Object.values(THEME_PRESETS),
      titles,
      sounds: SOUND_PRESETS,
      coins: state.coins,
      stats: state.stats,
      unlockedThemes: state.unlockedThemes,
      selectedThemeId: state.selectedThemeId,
      unlockTheme,
      selectTheme,
      unlockedSounds: state.unlockedSounds,
      selectedSoundId: state.selectedSoundId,
      unlockSound,
      selectSound,
      toggleSoundPlayback,
      isSoundPlaying,
      featuredBadgeId: state.featuredBadgeId,
      setFeaturedBadge,
      registerTaskCompletion,
      unregisterTaskCompletion,
      registerSubtaskCompletion,
      unregisterSubtaskCompletion,
      registerHabitCompletion,
      unregisterHabitCompletion,
      addFocusMinutes,
      earnCoins,
      loseCoins,
      syncHabitStreak,
      refreshRewards,
      markCelebrated,
      rewardsSynced,
      celebratedBadges: state.celebratedBadges,
      hydrated,
      playableSoundIds: Object.keys(SOUND_LIBRARY),
      resetThemeData,
    }),
    [
      theme, titles, state, hydrated, rewardsSynced, refreshRewards, markCelebrated, syncHabitStreak,
      unlockTheme, selectTheme, unlockSound, selectSound,
      toggleSoundPlayback, isSoundPlaying,
      setFeaturedBadge,
      registerTaskCompletion, unregisterTaskCompletion,
      registerSubtaskCompletion, unregisterSubtaskCompletion,
      registerHabitCompletion, unregisterHabitCompletion,
      addFocusMinutes, earnCoins, loseCoins, resetThemeData,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};