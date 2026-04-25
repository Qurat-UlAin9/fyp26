import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const STORAGE_KEY = 'app_rewards_theme_state_v3';

const SOUND_LIBRARY = {
  rain: require('../../assets/sounds/rain.mp3'),
  ocean: require('../../assets/sounds/ocean.mp3'),
  forest: require('../../assets/sounds/forest.mp3'),
  white: require('../../assets/sounds/analog-beats.mp3'),
};

const THEME_PRESETS = {
  vibrantLight: {
    id: 'vibrantLight', name: 'Vibrant Light', mode: 'light', cost: 0,
    background: ['#E9F6FF', '#FFF4EA', '#FFFFFF'], card: 'rgba(255,255,255,0.78)',
    text: '#0F172A', textSecondary: '#475569', accentGradient: ['#8B5CF6', '#22D3EE'],
    border: 'rgba(99,102,241,0.22)', glow: '#8B5CF6', tabGradient: ['#FFFFFF', '#EEF2FF'],
    quoteImage: 'https://images.unsplash.com/photo-1493244040629-496f6d136cc3?auto=format&fit=crop&w=1400&q=80',
  },
  sereneBlueDark: {
    id: 'sereneBlueDark', name: 'Serene Blue Dark', mode: 'dark', cost: 0,
    background: ['#070B22', '#0A1A46', '#0C2C70'], card: 'rgba(11, 19, 52, 0.72)',
    text: '#E2E8F0', textSecondary: '#BFDBFE', accentGradient: ['#60A5FA', '#22D3EE'],
    border: 'rgba(125,211,252,0.3)', glow: '#38BDF8', tabGradient: ['#081330', '#11204E'],
    quoteImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80',
  },
  auroraLight: {
    id: 'auroraLight', name: 'Aurora Light', mode: 'light', cost: 0,
    background: ['#EDFFF8', '#F1FAFF', '#FFF7ED'], card: 'rgba(255,255,255,0.82)',
    text: '#123145', textSecondary: '#4B6776', accentGradient: ['#14B8A6', '#0EA5E9'],
    border: 'rgba(14,165,233,0.24)', glow: '#14B8A6', tabGradient: ['#E6FFFB', '#E0F2FE'],
    quoteImage: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1400&q=80',
  },
  forestLight: { id: 'forestLight', name: 'Forest Light', mode: 'light', cost: 120, background: ['#eef9ee', '#f9f5eb', '#ffffff'], card: 'rgba(238, 248, 236, 0.7)', text: '#1f3d24', textSecondary: '#3f5c43', accentGradient: ['#84cc16', '#22c55e'], border: 'rgba(74, 124, 89, 0.2)', glow: '#65a30d', tabGradient: ['#eff9ef', '#f8f3e7'], quoteImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80' },
  galaxyDark: { id: 'galaxyDark', name: 'Galaxy Dark', mode: 'dark', cost: 140, background: ['#120026', '#1d0f45', '#08112f'], card: 'rgba(18, 22, 54, 0.58)', text: '#f8fafc', textSecondary: '#c4b5fd', accentGradient: ['#6366f1', '#22d3ee'], border: 'rgba(129,140,248,0.3)', glow: '#60a5fa', tabGradient: ['#11183b', '#1a1352'], quoteImage: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=80' },
  midnightDark: { id: 'midnightDark', name: 'Midnight Dark', mode: 'dark', cost: 150, background: ['#050505', '#111827', '#1f2937'], card: 'rgba(23, 23, 23, 0.75)', text: '#f8fafc', textSecondary: '#d1d5db', accentGradient: ['#a16207', '#facc15'], border: 'rgba(250,204,21,0.22)', glow: '#fcd34d', tabGradient: ['#0f0f10', '#1f2932'], quoteImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=80' },
};

const TITLES = [
  { id: 'focus-beginner', name: 'Focus Beginner', icon: '🧠', condition: (s) => s.focusMinutes >= 30 },
  { id: 'consistency-king', name: 'Consistency King', icon: '🔥', condition: (s) => s.habitStreak >= 7 },
  { id: 'task-warrior', name: 'Task Warrior', icon: '⚔️', condition: (s) => s.tasksCompleted >= 10 },
  { id: 'habit-master', name: 'Habit Master', icon: '🌱', condition: (s) => s.habitCompletions >= 20 },
  { id: 'deep-work-legend', name: 'Deep Work Legend', icon: '🌌', condition: (s) => s.focusMinutes >= 300 },
];
const SOUND_PRESETS = [{ id: 'rain', name: 'Rain', cost: 0 }, { id: 'ocean', name: 'Ocean Waves', cost: 50 }, { id: 'forest', name: 'Forest Ambience', cost: 50 }, { id: 'white', name: 'White Noise', cost: 75 }];
const ThemeContext = createContext(null);

const defaultState = {
  coins: 0,
  selectedThemeId: 'vibrantLight',
  unlockedThemes: ['vibrantLight', 'sereneBlueDark', 'auroraLight'],
  selectedSoundId: null,
  unlockedSounds: ['rain'],
  stats: { tasksCompleted: 0, subtasksCompleted: 0, habitCompletions: 0, habitStreak: 0, focusMinutes: 0 },
};

export const ThemeProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((raw) => raw && setState((p) => ({ ...p, ...JSON.parse(raw) }))).catch(() => undefined); }, []);
  useEffect(() => { AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined); }, [state]);
  useEffect(() => () => { soundRef.current?.unloadAsync(); }, []);

  const spendCoins = useCallback((amount) => {
    if (state.coins < amount) return false;
    setState((prev) => ({ ...prev, coins: prev.coins - amount }));
    return true;
  }, [state.coins]);

  const earnCoins = useCallback((amount) => amount && setState((prev) => ({ ...prev, coins: prev.coins + amount })), []);

  const unlockTheme = useCallback((id) => {
    if (state.unlockedThemes.includes(id)) return { ok: true };
    const preset = THEME_PRESETS[id];
    if (!preset) return { ok: false, reason: 'Theme not found' };
    if (!spendCoins(preset.cost)) return { ok: false, reason: 'Not enough coins' };
    setState((prev) => ({ ...prev, unlockedThemes: [...prev.unlockedThemes, id] }));
    return { ok: true };
  }, [spendCoins, state.unlockedThemes]);

  const selectTheme = useCallback((id) => setState((prev) => (prev.unlockedThemes.includes(id) ? { ...prev, selectedThemeId: id } : prev)), []);
  const unlockSound = useCallback((id) => {
    if (state.unlockedSounds.includes(id)) return { ok: true };
    const preset = SOUND_PRESETS.find((item) => item.id === id);
    if (!preset) return { ok: false, reason: 'Sound not found' };
    if (!spendCoins(preset.cost)) return { ok: false, reason: 'Not enough coins' };
    setState((prev) => ({ ...prev, unlockedSounds: [...prev.unlockedSounds, id] }));
    return { ok: true };
  }, [spendCoins, state.unlockedSounds]);
  const selectSound = useCallback((id) => setState((prev) => (prev.unlockedSounds.includes(id) ? { ...prev, selectedSoundId: id } : prev)), []);

  const toggleSoundPlayback = useCallback(async () => {
    if (!state.selectedSoundId) return;
    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(SOUND_LIBRARY[state.selectedSoundId], { isLooping: true, shouldPlay: true, volume: 0.5 });
        soundRef.current = sound;
        setIsSoundPlaying(true);
        return;
      }
      if (isSoundPlaying) await soundRef.current.pauseAsync(); else await soundRef.current.playAsync();
      setIsSoundPlaying((prev) => !prev);
    } catch {
      setIsSoundPlaying(false);
    }
  }, [isSoundPlaying, state.selectedSoundId]);

  useEffect(() => { const swap = async () => { if (!soundRef.current) return; await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; setIsSoundPlaying(false); }; swap(); }, [state.selectedSoundId]);

  const registerTaskCompletion = useCallback(() => { earnCoins(5); setState((prev) => ({ ...prev, stats: { ...prev.stats, tasksCompleted: prev.stats.tasksCompleted + 1 } })); }, [earnCoins]);
  const registerSubtaskCompletion = useCallback(() => { earnCoins(1); setState((prev) => ({ ...prev, stats: { ...prev.stats, subtasksCompleted: prev.stats.subtasksCompleted + 1 } })); }, [earnCoins]);
  const registerHabitCompletion = useCallback(() => { earnCoins(2); setState((prev) => ({ ...prev, stats: { ...prev.stats, habitCompletions: prev.stats.habitCompletions + 1, habitStreak: Math.min(prev.stats.habitStreak + 1, 30) } })); }, [earnCoins]);
  const addFocusMinutes = useCallback((minutes) => minutes && setState((prev) => ({ ...prev, stats: { ...prev.stats, focusMinutes: prev.stats.focusMinutes + minutes } })), []);

  const titles = useMemo(() => TITLES.map((item) => ({ ...item, unlocked: item.condition(state.stats) })), [state.stats]);
  const theme = THEME_PRESETS[state.selectedThemeId] || THEME_PRESETS.vibrantLight;

  const value = useMemo(() => ({
    theme, colors: theme, isDark: theme.mode === 'dark', themes: Object.values(THEME_PRESETS),
    titles, sounds: SOUND_PRESETS, coins: state.coins, stats: state.stats,
    unlockedThemes: state.unlockedThemes, selectedThemeId: state.selectedThemeId, unlockTheme, selectTheme,
    unlockedSounds: state.unlockedSounds, selectedSoundId: state.selectedSoundId, unlockSound, selectSound,
    toggleSoundPlayback, isSoundPlaying, registerTaskCompletion, registerSubtaskCompletion, registerHabitCompletion, addFocusMinutes, earnCoins,
  }), [theme, titles, state, unlockTheme, selectTheme, unlockSound, selectSound, toggleSoundPlayback, isSoundPlaying, registerTaskCompletion, registerSubtaskCompletion, registerHabitCompletion, addFocusMinutes, earnCoins]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
