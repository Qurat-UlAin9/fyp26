import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const STORAGE_KEY = 'app_rewards_theme_state_v2';

const SOUND_LIBRARY = {
  rain: require('../../assets/sounds/rain.mp3'),
  ocean: require('../../assets/sounds/ocean.mp3'),
  forest: require('../../assets/sounds/forest.mp3'),
  white: require('../../assets/sounds/analog-beats.mp3'),
};

const THEME_PRESETS = {
  oceanLight: {
    id: 'oceanLight',
    name: 'Ocean Light',
    mode: 'light',
    cost: 0,
    background: ['#dff5ff', '#eefbff', '#ffffff'],
    card: 'rgba(230, 247, 255, 0.62)',
    text: '#083344',
    textSecondary: '#155e75',
    accentGradient: ['#38bdf8', '#14b8a6'],
    border: 'rgba(20,184,166,0.22)',
    glow: '#38bdf8',
    tabGradient: ['#effaff', '#d7f3ff'],
    quoteImage:
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=80',
  },
  forestLight: {
    id: 'forestLight',
    name: 'Forest Light',
    mode: 'light',
    cost: 120,
    background: ['#eef9ee', '#f9f5eb', '#ffffff'],
    card: 'rgba(238, 248, 236, 0.7)',
    text: '#1f3d24',
    textSecondary: '#3f5c43',
    accentGradient: ['#84cc16', '#22c55e'],
    border: 'rgba(74, 124, 89, 0.2)',
    glow: '#65a30d',
    tabGradient: ['#eff9ef', '#f8f3e7'],
    quoteImage:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80',
  },
  galaxyDark: {
    id: 'galaxyDark',
    name: 'Galaxy Dark',
    mode: 'dark',
    cost: 140,
    background: ['#120026', '#1d0f45', '#08112f'],
    card: 'rgba(18, 22, 54, 0.58)',
    text: '#f8fafc',
    textSecondary: '#c4b5fd',
    accentGradient: ['#6366f1', '#22d3ee'],
    border: 'rgba(129,140,248,0.3)',
    glow: '#60a5fa',
    tabGradient: ['#11183b', '#1a1352'],
    quoteImage:
      'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80',
  },
  midnightDark: {
    id: 'midnightDark',
    name: 'Midnight Dark',
    mode: 'dark',
    cost: 150,
    background: ['#050505', '#111827', '#1f2937'],
    card: 'rgba(23, 23, 23, 0.75)',
    text: '#f8fafc',
    textSecondary: '#d1d5db',
    accentGradient: ['#a16207', '#facc15'],
    border: 'rgba(250,204,21,0.22)',
    glow: '#fcd34d',
    tabGradient: ['#0f0f10', '#1f2932'],
    quoteImage:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80',
  },
};

const TITLES = [
  { id: 'focus-beginner', name: 'Focus Beginner', icon: '🧠', condition: (s) => s.focusMinutes >= 30 },
  { id: 'consistency-king', name: 'Consistency King', icon: '🔥', condition: (s) => s.habitStreak >= 7 },
  { id: 'task-warrior', name: 'Task Warrior', icon: '⚔️', condition: (s) => s.tasksCompleted >= 10 },
  { id: 'habit-master', name: 'Habit Master', icon: '🌱', condition: (s) => s.habitCompletions >= 20 },
  { id: 'deep-work-legend', name: 'Deep Work Legend', icon: '🌌', condition: (s) => s.focusMinutes >= 300 },
];

const SOUND_PRESETS = [
  { id: 'rain', name: 'Rain', cost: 0 },
  { id: 'ocean', name: 'Ocean Waves', cost: 50 },
  { id: 'forest', name: 'Forest Ambience', cost: 50 },
  { id: 'white', name: 'White Noise', cost: 75 },
];

const ThemeContext = createContext(null);

const defaultState = {
  coins: 90,
  selectedThemeId: 'oceanLight',
  unlockedThemes: ['oceanLight'],
  selectedSoundId: null,
  unlockedSounds: ['rain'],
  stats: { tasksCompleted: 0, subtasksCompleted: 0, habitCompletions: 0, habitStreak: 0, focusMinutes: 0 },
};

export const ThemeProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState((prev) => ({ ...prev, ...JSON.parse(raw) }));
      } catch (error) {
        console.warn('Unable to load reward state', error);
      }
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const spendCoins = useCallback((amount) => {
    if (state.coins < amount) return false;
    setState((prev) => ({ ...prev, coins: prev.coins - amount }));
    return true;
  }, [state.coins]);

  const earnCoins = useCallback((amount) => {
    if (!amount) return;
    setState((prev) => ({ ...prev, coins: prev.coins + amount }));
  }, []);

  const unlockTheme = useCallback(
    (id) => {
      if (state.unlockedThemes.includes(id)) return { ok: true };
      const preset = THEME_PRESETS[id];
      if (!preset) return { ok: false, reason: 'Theme not found' };
      const canPay = spendCoins(preset.cost);
      if (!canPay) return { ok: false, reason: 'Not enough coins' };
      setState((prev) => ({ ...prev, unlockedThemes: [...prev.unlockedThemes, id] }));
      return { ok: true };
    },
    [spendCoins, state.unlockedThemes]
  );

  const selectTheme = useCallback((id) => {
    setState((prev) =>
      prev.unlockedThemes.includes(id) ? { ...prev, selectedThemeId: id } : prev
    );
  }, []);

  const unlockSound = useCallback(
    (id) => {
      if (state.unlockedSounds.includes(id)) return { ok: true };
      const preset = SOUND_PRESETS.find((item) => item.id === id);
      if (!preset) return { ok: false, reason: 'Sound not found' };
      const canPay = spendCoins(preset.cost);
      if (!canPay) return { ok: false, reason: 'Not enough coins' };
      setState((prev) => ({ ...prev, unlockedSounds: [...prev.unlockedSounds, id] }));
      return { ok: true };
    },
    [spendCoins, state.unlockedSounds]
  );

  const selectSound = useCallback((id) => {
    setState((prev) =>
      prev.unlockedSounds.includes(id) ? { ...prev, selectedSoundId: id } : prev
    );
  }, []);

  const toggleSoundPlayback = useCallback(async () => {
    if (!state.selectedSoundId) return;
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(SOUND_LIBRARY[state.selectedSoundId], {
          isLooping: true,
          shouldPlay: true,
          volume: 0.5,
        });
        soundRef.current = sound;
        setIsSoundPlaying(true);
        return;
      }
      if (isSoundPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
      setIsSoundPlaying((prev) => !prev);
    } catch (error) {
      console.warn('Sound playback failed', error);
    }
  }, [isSoundPlaying, state.selectedSoundId]);

  useEffect(() => {
    const swapSound = async () => {
      if (!soundRef.current) return;
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsSoundPlaying(false);
    };
    swapSound();
  }, [state.selectedSoundId]);

  const registerTaskCompletion = useCallback(() => {
    earnCoins(5);
    setState((prev) => ({ ...prev, stats: { ...prev.stats, tasksCompleted: prev.stats.tasksCompleted + 1 } }));
  }, [earnCoins]);

  const registerSubtaskCompletion = useCallback(() => {
    earnCoins(1);
    setState((prev) => ({ ...prev, stats: { ...prev.stats, subtasksCompleted: prev.stats.subtasksCompleted + 1 } }));
  }, [earnCoins]);

  const registerHabitCompletion = useCallback(() => {
    earnCoins(2);
    setState((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        habitCompletions: prev.stats.habitCompletions + 1,
        habitStreak: Math.min(prev.stats.habitStreak + 1, 30),
      },
    }));
  }, [earnCoins]);

  const addFocusMinutes = useCallback((minutes) => {
    if (!minutes) return;
    setState((prev) => ({ ...prev, stats: { ...prev.stats, focusMinutes: prev.stats.focusMinutes + minutes } }));
  }, []);


  const toggleTheme = useCallback(() => {
    setState((prev) => {
      const order = ['oceanLight', 'forestLight', 'galaxyDark', 'midnightDark'];
      const currentIndex = order.indexOf(prev.selectedThemeId);
      const nextId = order[(currentIndex + 1) % order.length];
      const fallbackId = prev.unlockedThemes.includes(nextId) ? nextId : prev.unlockedThemes[0] || 'oceanLight';
      return { ...prev, selectedThemeId: fallbackId };
    });
  }, []);

  const titles = useMemo(
    () => TITLES.map((item) => ({ ...item, unlocked: item.condition(state.stats) })),
    [state.stats]
  );

  const theme = THEME_PRESETS[state.selectedThemeId] || THEME_PRESETS.oceanLight;

  const value = useMemo(
    () => ({
      theme,
      colors: theme,
      isDark: theme.mode === 'dark',
      themes: Object.values(THEME_PRESETS),
      toggleTheme,
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
      registerTaskCompletion,
      registerSubtaskCompletion,
      registerHabitCompletion,
      addFocusMinutes,
      earnCoins,
    }),
    [theme, titles, state, unlockTheme, selectTheme, unlockSound, selectSound, toggleSoundPlayback, isSoundPlaying, registerTaskCompletion, registerSubtaskCompletion, registerHabitCompletion, addFocusMinutes, earnCoins, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
};
