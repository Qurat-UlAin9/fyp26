import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useProductivity } from '../../contexts/ProductivityContext';
import TimerRing from '../../components/focus/TimerRing';
import ControlButtons from '../../components/focus/ControlButtons';
import SoundBottomSheet from '../../components/focus/SoundBottomSheet';
import StatsSection from '../../components/focus/StatsSection';
import UnlockMusicCard from '../../components/focus/UnlockMusicCard';

const DEFAULT_TIMER_SECONDS = 25 * 60;

const SOUND_OPTIONS = [
  { key: 'deep-focus', label: 'Deep Focus', emoji: '🎵', description: 'Analog beats for flow state', source: require('../../../assets/sounds/analog-beats.mp3') },
  { key: 'brown-noise', label: 'Brown Noise', emoji: '🌿', description: 'Forest ambience & calm', source: require('../../../assets/sounds/forest.mp3') },
  { key: 'rain-rhythm', label: 'Rain Rhythm', emoji: '🌧️', description: 'Steady rain on rooftops', source: require('../../../assets/sounds/rain.mp3') },
  { key: 'soft-beats', label: 'Soft Beats', emoji: '🌊', description: 'Ocean waves & soft tones', source: require('../../../assets/sounds/ocean.mp3') },
];

export default function FocusScreen() {
  const { theme, isDark } = useTheme();
  const { activeSessionTask } = useProductivity();

  const soundSheetRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timerEndAtRef = useRef(null);
  const activeSoundRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const accumulatedSecondsRef = useRef(0);

  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [selectedSound, setSelectedSound] = useState(null);
  const [completionMessage, setCompletionMessage] = useState('');

  const sounds = useMemo(() => SOUND_OPTIONS, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    }).catch(() => {});

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (activeSoundRef.current) {
        activeSoundRef.current.stopAsync().catch(() => {});
        activeSoundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const onTimerComplete = useCallback(() => {
    clearTimerInterval();
    // Calculate real elapsed seconds for this run
    const elapsed = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      : DEFAULT_TIMER_SECONDS;
    accumulatedSecondsRef.current += elapsed;
    sessionStartTimeRef.current = null;
    timerEndAtRef.current = null;
    setIsRunning(false);
    setTimeLeft(0);
    setCompletedSessions((prev) => prev + 1);
    setTotalMinutes(Math.floor(accumulatedSecondsRef.current / 60));
    setCompletionMessage('Session complete! Amazing work 🎉');
    Audio.Sound.createAsync(require('../../../assets/sounds/ocean.mp3'), { shouldPlay: true, isLooping: false })
      .then(({ sound }) => { setTimeout(() => sound.unloadAsync().catch(() => {}), 1600); })
      .catch(() => {});
    Alert.alert('Session Complete', 'Amazing work! Take a short break.');
  }, [clearTimerInterval]);

  const startTimer = useCallback(() => {
    if (isRunning || timeLeft <= 0) return;
    setCompletionMessage('');
    setIsRunning(true);
    sessionStartTimeRef.current = Date.now();
    timerEndAtRef.current = Date.now() + timeLeft * 1000;
    clearTimerInterval();
    timerIntervalRef.current = setInterval(() => {
      const remainingMs = (timerEndAtRef.current || Date.now()) - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(nextSeconds);
      // Update live minutes counter
      if (sessionStartTimeRef.current) {
        const elapsedThisRun = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        const totalSecs = accumulatedSecondsRef.current + elapsedThisRun;
        setTotalMinutes(Math.floor(totalSecs / 60));
      }
      if (nextSeconds <= 0) onTimerComplete();
    }, 250);
  }, [clearTimerInterval, isRunning, onTimerComplete, timeLeft]);

  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    const remainingMs = (timerEndAtRef.current || Date.now()) - Date.now();
    setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    // Save elapsed time so far into accumulator
    if (sessionStartTimeRef.current) {
      accumulatedSecondsRef.current += Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
      sessionStartTimeRef.current = null;
    }
    setIsRunning(false);
    timerEndAtRef.current = null;
    clearTimerInterval();
  }, [clearTimerInterval, isRunning]);

  const handleTogglePlay = useCallback(() => {
    if (isRunning) { pauseTimer(); return; }
    if (timeLeft === 0) setTimeLeft(DEFAULT_TIMER_SECONDS);
    startTimer();
  }, [isRunning, pauseTimer, startTimer, timeLeft]);

  const handleReset = useCallback(() => {
    clearTimerInterval();
    timerEndAtRef.current = null;
    sessionStartTimeRef.current = null;
    accumulatedSecondsRef.current = 0;
    setIsRunning(false);
    setTimeLeft(DEFAULT_TIMER_SECONDS);
    setTotalMinutes(0);
    setCompletionMessage('');
  }, [clearTimerInterval]);

  const handleSelectSound = useCallback(async (soundKey) => {
    // Toggle off if same sound tapped
    if (soundKey === selectedSound) {
      try {
        if (activeSoundRef.current) {
          await activeSoundRef.current.stopAsync();
          await activeSoundRef.current.unloadAsync();
          activeSoundRef.current = null;
        }
      } catch {}
      setSelectedSound(null);
      return;
    }

    const selected = sounds.find((item) => item.key === soundKey);
    if (!selected) return;

    try {
      if (activeSoundRef.current) {
        await activeSoundRef.current.stopAsync();
        await activeSoundRef.current.unloadAsync();
        activeSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(selected.source, {
        shouldPlay: true,
        isLooping: true,
        volume: 0.55,
      });
      activeSoundRef.current = sound;
      setSelectedSound(soundKey);
    } catch {
      Alert.alert('Audio Error', 'Unable to play this sound right now.');
    }
  }, [selectedSound, sounds]);

  const openSoundSheet = useCallback(() => {
    soundSheetRef.current?.expand();
  }, []);

  return (
    <LinearGradient
      colors={isDark ? ['#050C1A', '#080F20', '#050C1A'] : ['#EFF6FF', '#F8FAFF', '#EFF6FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#E0F2FE' : '#0F172A' }]}>
              Focus Session
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#334155' : '#94A3B8' }]}>
              Stay present · One task at a time
            </Text>

            {activeSessionTask ? (
              <View style={[
                styles.taskPill,
                { backgroundColor: isDark ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.3)' }
              ]}>
                <Text style={styles.taskPillDot}>⚡</Text>
                <Text style={[styles.taskPillText, { color: isDark ? '#7DD3FC' : '#0284C7' }]} numberOfLines={1}>
                  {activeSessionTask.title}
                </Text>
              </View>
            ) : (
              <View style={[
                styles.taskPill,
                { backgroundColor: isDark ? 'rgba(51,65,85,0.4)' : 'rgba(148,163,184,0.1)', borderColor: isDark ? 'rgba(51,65,85,0.6)' : 'rgba(148,163,184,0.25)' }
              ]}>
                <Text style={[styles.taskPillText, { color: isDark ? '#475569' : '#94A3B8' }]}>
                  No active task selected
                </Text>
              </View>
            )}
          </View>

          {/* Timer Ring */}
          <View style={styles.ringWrapper}>
            <TimerRing
              totalSeconds={DEFAULT_TIMER_SECONDS}
              timeLeft={timeLeft}
              isRunning={isRunning}
            />
          </View>

          {/* Controls */}
          <ControlButtons
            isRunning={isRunning}
            onReset={handleReset}
            onTogglePlay={handleTogglePlay}
            onOpenSound={openSoundSheet}
          />

          {/* Stats */}
          <StatsSection completedSessions={completedSessions} totalMinutes={totalMinutes} />

          {/* Unlock Card */}
          <View style={styles.cardWrapper}>
            <UnlockMusicCard completedSessions={completedSessions} />
          </View>

          {/* Completion Banner */}
          {!!completionMessage && (
            <View style={styles.completionBanner}>
              <LinearGradient
                colors={['rgba(56,189,248,0.15)', 'rgba(167,139,250,0.15)']}
                style={styles.completionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.completionText}>{completionMessage}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Bottom padding so content clears tab nav */}
          <View style={styles.bottomPad} />
        </ScrollView>
      </SafeAreaView>

      <SoundBottomSheet
        sheetRef={soundSheetRef}
        sounds={sounds}
        selectedSound={selectedSound}
        onSelectSound={handleSelectSound}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  taskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
    maxWidth: '85%',
  },
  taskPillDot: {
    fontSize: 12,
    marginRight: 6,
  },
  taskPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ringWrapper: {
    marginTop: 10,
    marginBottom: 0,
  },
  cardWrapper: {
    width: '100%',
    marginTop: 4,
  },
  completionBanner: {
    width: '100%',
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  completionGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
  },
  completionText: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPad: {
    height: 110,
  },
});