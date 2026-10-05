import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListChecks, X, Clock3, Zap } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { useProductivity } from '../../contexts/ProductivityContext';
import { useAppData } from '../../contexts/AppDataContext';
import TimerRing from '../../components/focus/TimerRing';
import ControlButtons from '../../components/focus/ControlButtons';
import SoundBottomSheet from '../../components/focus/SoundBottomSheet';
import TaskPickerSheet from '../../components/focus/TaskPickerSheet';
import SessionReflectionModal from '../../components/focus/SessionReflectionModal';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';

const DURATION_OPTIONS = [15, 25, 45, 60, 90];
const DEFAULT_DURATION = 25;

const SOUND_OPTIONS = [
  { key: 'none', label: 'No Sound', emoji: '🔇', description: 'Focus in silence', source: null },
  { key: 'deep-focus', label: 'Deep Focus', emoji: '🎵', description: 'Analog beats for flow state', source: require('../../../assets/sounds/analog-beats.mp3') },
  { key: 'brown-noise', label: 'Brown Noise', emoji: '🌿', description: 'Forest ambience & calm', source: require('../../../assets/sounds/forest.mp3') },
  { key: 'rain-rhythm', label: 'Rain Rhythm', emoji: '🌧️', description: 'Steady rain on rooftops', source: require('../../../assets/sounds/rain.mp3') },
  { key: 'soft-beats', label: 'Soft Beats', emoji: '🌊', description: 'Ocean waves & soft tones', source: require('../../../assets/sounds/ocean.mp3') },
];

const COMPLETION_CHIME = require('../../../assets/sounds/Notes/Ripple1.mp3');

export default function FocusScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const { activeSessionTask, setActiveSessionTask } = useProductivity();
  const {
    tasks,
    focusSessions,
    addFocusSession,
    updateFocusSession,
    addMoodLog,
  } = useAppData();

  const soundSheetRef = useRef(null);
  const taskSheetRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timerEndAtRef = useRef(null);
  const activeSoundRef = useRef(null);
  const chimeRef = useRef(null);
  const sessionStartTimeRef = useRef(null);
  const accumulatedSecondsRef = useRef(0);
  const lastPersistedSecondsRef = useRef(0);
  const sessionIdRef = useRef(null);
  const loadedSoundKeyRef = useRef(null);

  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedSound, setSelectedSound] = useState('none');
  const [showReflection, setShowReflection] = useState(false);
  const [completedSessionMinutes, setCompletedSessionMinutes] = useState(0);

  const timeLeftRef = useRef(timeLeft);
  const durationMinutesRef = useRef(durationMinutes);
  const activeSessionTaskRef = useRef(activeSessionTask);
  const isRunningRef = useRef(isRunning);

  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { durationMinutesRef.current = durationMinutes; }, [durationMinutes]);
  useEffect(() => { activeSessionTaskRef.current = activeSessionTask; }, [activeSessionTask]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  const sounds = useMemo(() => SOUND_OPTIONS, []);

  const findExistingSessionForTask = useCallback(
    (taskId) => {
      if (!taskId) return null;
      return (
        focusSessions.find(
          (s) => s.taskId === taskId && s.status !== 'Cancelled'
        ) || null
      );
    },
    [focusSessions]
  );

  const sessionsWithMinutes = useMemo(
    () => focusSessions.filter((s) => (s.actualMinutes || 0) >= 1),
    [focusSessions]
  );
  const totalMinutesAllTime = useMemo(
    () => sessionsWithMinutes.reduce((sum, s) => sum + (s.actualMinutes || 0), 0),
    [sessionsWithMinutes]
  );
  const completedSessionsCount = sessionsWithMinutes.length;

  useEffect(() => {
    const incoming = route?.params?.task;
    if (!incoming) return;
    setActiveSessionTask(incoming);
    navigation.setParams({ task: undefined });
  }, [route?.params?.task, navigation, setActiveSessionTask]);

  useEffect(() => {
    const sid = route?.params?.resumeSessionId;
    if (!sid) return;

    sessionIdRef.current = sid;

    const existing = focusSessions.find((s) => s.id === sid);
    const mins = existing?.plannedMinutes || 25;

    setDurationMinutes(mins);
    setTimeLeft(mins * 60);
    durationMinutesRef.current = mins;
    timeLeftRef.current = mins * 60;

    Toast.show({
      type: 'success',
      text1: 'Session loaded',
      text2: `${mins} min · press play to continue`,
      visibilityTime: 2000,
    });

    navigation.setParams({ resumeSessionId: undefined, _ts: undefined });
  }, [route?.params?.resumeSessionId, route?.params?._ts, focusSessions, navigation]);

  useEffect(() => {
    const cfg = route?.params?.autoStartConfig;
    if (!cfg) return;

    let matched = null;
    if (cfg.taskTitle && Array.isArray(tasks) && tasks.length > 0) {
      const needle = String(cfg.taskTitle).toLowerCase().trim();
      matched =
        tasks.find((t) => t.title.toLowerCase() === needle) ||
        tasks.find((t) => t.title.toLowerCase().includes(needle)) ||
        tasks.find((t) => needle.includes(t.title.toLowerCase())) ||
        null;
    }

    if (matched) setActiveSessionTask(matched);

    const mins = cfg.minutes || 25;
    setDurationMinutes(mins);
    setTimeLeft(mins * 60);

    navigation.setParams({ autoStartConfig: undefined });

    const t = setTimeout(() => {
      try { startTimerRef.current?.(); } catch (e) {}
    }, 400);

    return () => clearTimeout(t);
  }, [route?.params?.autoStartConfig]);

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
      if (chimeRef.current) {
        chimeRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const manageSound = async () => {
      const opt = sounds.find((s) => s.key === selectedSound);
      const hasSound = opt && opt.source;

      if (!hasSound) {
        if (activeSoundRef.current) {
          try { await activeSoundRef.current.stopAsync(); } catch {}
          try { await activeSoundRef.current.unloadAsync(); } catch {}
          activeSoundRef.current = null;
          loadedSoundKeyRef.current = null;
        }
        return;
      }

      if (
        loadedSoundKeyRef.current &&
        loadedSoundKeyRef.current !== selectedSound
      ) {
        if (activeSoundRef.current) {
          try { await activeSoundRef.current.stopAsync(); } catch {}
          try { await activeSoundRef.current.unloadAsync(); } catch {}
          activeSoundRef.current = null;
        }
        loadedSoundKeyRef.current = null;
      }

      if (!activeSoundRef.current) {
        try {
          const { sound } = await Audio.Sound.createAsync(opt.source, {
            shouldPlay: isRunning,
            isLooping: true,
            volume: 0.55,
          });
          if (cancelled) {
            sound.unloadAsync().catch(() => {});
            return;
          }
          activeSoundRef.current = sound;
          loadedSoundKeyRef.current = selectedSound;
        } catch (err) {
          console.warn('Sound load failed:', err?.message);
        }
        return;
      }

      try {
        if (isRunning) {
          const status = await activeSoundRef.current.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) {
            await activeSoundRef.current.playAsync();
          }
        } else {
          await activeSoundRef.current.pauseAsync();
        }
      } catch {}
    };

    manageSound();
    return () => { cancelled = true; };
  }, [isRunning, selectedSound, sounds]);

  const persistProgress = useCallback(
    async (finalStatus) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return 0;

      const totalSeconds = accumulatedSecondsRef.current;
      const totalMinutes = Math.floor(totalSeconds / 60);
      const persistedMinutes = Math.floor(lastPersistedSecondsRef.current / 60);
      const deltaMinutes = Math.max(0, totalMinutes - persistedMinutes);

      if (deltaMinutes < 1 && finalStatus !== 'Completed') {
        return 0;
      }

      try {
        const updated = await updateFocusSession(sessionId, (prev) => ({
          ...prev,
          actualMinutes: (prev.actualMinutes || 0) + deltaMinutes,
          plannedMinutes: durationMinutesRef.current,
          status: finalStatus,
          completed: finalStatus === 'Completed',
          endedAt:
            finalStatus === 'Completed' ? new Date().toISOString() : prev.endedAt,
        }));
        lastPersistedSecondsRef.current = totalSeconds;
        return updated?.actualMinutes || deltaMinutes;
      } catch (err) {
        console.warn('Persist failed:', err?.message);
        return 0;
      }
    },
    [updateFocusSession]
  );

  const onTimerComplete = useCallback(async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const elapsed = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      : durationMinutesRef.current * 60;
    accumulatedSecondsRef.current += elapsed;
    sessionStartTimeRef.current = null;
    timerEndAtRef.current = null;
    setIsRunning(false);
    setTimeLeft(0);

    const thisRunMinutes = Math.floor(accumulatedSecondsRef.current / 60);
    setCompletedSessionMinutes(thisRunMinutes);

    if (activeSoundRef.current) {
      try { await activeSoundRef.current.stopAsync(); } catch {}
      try { await activeSoundRef.current.unloadAsync(); } catch {}
      activeSoundRef.current = null;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(COMPLETION_CHIME, {
        shouldPlay: true,
        isLooping: false,
        volume: 0.9,
      });
      chimeRef.current = sound;
      setTimeout(() => {
        sound.unloadAsync().catch(() => {});
        chimeRef.current = null;
      }, 2500);
    } catch (err) {
      console.warn('Chime failed:', err?.message);
    }

    await persistProgress('Completed');
    setShowReflection(true);
  }, [persistProgress]);

  const startTimer = useCallback(async () => {
    const effectiveTimeLeft = timeLeftRef.current;
    const effectiveDuration = durationMinutesRef.current;
    const effectiveTask = activeSessionTaskRef.current;

    if (isRunningRef.current || effectiveTimeLeft <= 0) return;

    if (!sessionIdRef.current) {
      const existing = effectiveTask?.id
        ? findExistingSessionForTask(effectiveTask.id)
        : null;

      if (existing) {
        sessionIdRef.current = existing.id;
        try {
          await updateFocusSession(existing.id, (prev) => ({
            ...prev,
            startedAt: new Date().toISOString(),
            plannedMinutes: effectiveDuration,
            status: 'In Progress',
          }));
        } catch (err) {
          console.warn('Reuse update failed:', err?.message);
        }
      } else {
        try {
          const created = await addFocusSession({
            taskId: effectiveTask?.id || null,
            taskTitle: effectiveTask?.title || 'Focus Session',
            isoKey: new Date().toISOString().slice(0, 10),
            startHour: new Date().getHours(),
            startMin: new Date().getMinutes(),
            plannedMinutes: effectiveDuration,
            status: 'In Progress',
            actualMinutes: 0,
          });
          sessionIdRef.current = created?.id || null;
        } catch (err) {
          console.warn('Create session failed:', err?.message);
        }
      }

      lastPersistedSecondsRef.current = 0;
    }

    setIsRunning(true);
    sessionStartTimeRef.current = Date.now();
    timerEndAtRef.current = Date.now() + effectiveTimeLeft * 1000;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      const remainingMs = (timerEndAtRef.current || Date.now()) - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(nextSeconds);
      if (nextSeconds <= 0) onTimerComplete();
    }, 250);
  }, [
    findExistingSessionForTask,
    addFocusSession,
    updateFocusSession,
    onTimerComplete,
  ]);

  const startTimerRef = useRef(startTimer);
  useEffect(() => { startTimerRef.current = startTimer; }, [startTimer]);

  const pauseTimer = useCallback(async () => {
    if (!isRunningRef.current) return;
    const remainingMs = (timerEndAtRef.current || Date.now()) - Date.now();
    setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    if (sessionStartTimeRef.current) {
      accumulatedSecondsRef.current += Math.floor(
        (Date.now() - sessionStartTimeRef.current) / 1000
      );
      sessionStartTimeRef.current = null;
    }
    setIsRunning(false);
    timerEndAtRef.current = null;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    await persistProgress('Paused');
  }, [persistProgress]);

  const handleTogglePlay = useCallback(() => {
    if (isRunningRef.current) pauseTimer();
    else startTimer();
  }, [pauseTimer, startTimer]);

  const handleReset = useCallback(async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerEndAtRef.current = null;
    sessionStartTimeRef.current = null;

    if (activeSoundRef.current) {
      try { await activeSoundRef.current.stopAsync(); } catch {}
      try { await activeSoundRef.current.unloadAsync(); } catch {}
      activeSoundRef.current = null;
    }

    const mins = Math.floor(accumulatedSecondsRef.current / 60);

    if (sessionIdRef.current) {
      if (mins >= 1) {
        await persistProgress('Paused');
      } else {
        try {
          await updateFocusSession(sessionIdRef.current, (prev) => ({
            ...prev,
            status: 'Cancelled',
            completed: false,
          }));
        } catch {}
      }
    }

    accumulatedSecondsRef.current = 0;
    lastPersistedSecondsRef.current = 0;
    sessionIdRef.current = null;
    setIsRunning(false);
    setTimeLeft(durationMinutesRef.current * 60);
  }, [persistProgress, updateFocusSession]);

  const handleDurationChange = useCallback(
    (mins) => {
      if (isRunningRef.current) return;
      setDurationMinutes(mins);
      setTimeLeft(mins * 60);
    },
    []
  );

  const handleSelectSound = useCallback((soundKey) => {
    setSelectedSound(soundKey);
  }, []);

  const handleOpenSoundSheet = useCallback(() => {
    soundSheetRef.current?.expand();
  }, []);

  const handleOpenTaskSheet = useCallback(() => {
    taskSheetRef.current?.expand();
  }, []);

  const handleSelectTask = useCallback(
    (task) => {
      setActiveSessionTask(task);
    },
    [setActiveSessionTask]
  );

  const handleClearTask = useCallback(() => {
    setActiveSessionTask(null);
  }, [setActiveSessionTask]);

  const handleSaveReflection = useCallback(
    async ({ mood, rating }) => {
      if (mood) {
        try {
          await addMoodLog({
            mood,
            source: 'exercise_post',
            context: {
              sessionId: sessionIdRef.current,
              minutes: completedSessionMinutes,
              taskTitle: activeSessionTask?.title || null,
            },
          });
        } catch (err) {
          console.warn('Mood log failed:', err?.message);
        }
      }

      if (sessionIdRef.current) {
        try {
          await updateFocusSession(sessionIdRef.current, (prev) => ({
            ...prev,
            moodAfter: mood || null,
            userRating: rating || null,
          }));
        } catch (err) {
          console.warn('Reflection update failed:', err?.message);
        }
      }

      setShowReflection(false);
      sessionIdRef.current = null;
      accumulatedSecondsRef.current = 0;
      lastPersistedSecondsRef.current = 0;
      setCompletedSessionMinutes(0);
      setTimeLeft(durationMinutesRef.current * 60);

      Toast.show({
        type: 'success',
        text1: 'Session saved',
        text2: `${completedSessionMinutes} minutes logged`,
        visibilityTime: 2200,
      });
    },
    [
      completedSessionMinutes,
      activeSessionTask,
      addMoodLog,
      updateFocusSession,
    ]
  );

  const handleSkipReflection = useCallback(() => {
    setShowReflection(false);
    sessionIdRef.current = null;
    accumulatedSecondsRef.current = 0;
    lastPersistedSecondsRef.current = 0;
    setCompletedSessionMinutes(0);
    setTimeLeft(durationMinutesRef.current * 60);
  }, []);

  const totalSeconds = durationMinutes * 60;

  const hasTask = Boolean(activeSessionTask);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={
          isDark
            ? ['#0B0725', '#0F0820', '#080512']
            : ['#F5F3FF', '#FAF5FF', '#EFF6FF']
        }
        style={StyleSheet.absoluteFill}
      />
      <AnimatedOrbsBackground
        colors={[
          theme.glow + '40',
          theme.accentGradient[0] + '20',
          theme.accentGradient[1] + '20',
        ]}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#F5F3FF' : '#1E1B4B' }]}>
              Focus Session
            </Text>
            <Text style={[styles.subtitle, { color: '#8B5CF6' }]}>
              One task at a time
            </Text>
          </View>

          {/* Task pill */}
          <TouchableOpacity
            onPress={handleOpenTaskSheet}
            activeOpacity={0.85}
            disabled={isRunning}
            style={[
              styles.taskPill,
              hasTask
                ? {
                    backgroundColor: 'rgba(139,92,246,0.12)',
                    borderColor: 'rgba(139,92,246,0.45)',
                  }
                : {
                    backgroundColor: 'rgba(139,92,246,0.06)',
                    borderColor: 'rgba(139,92,246,0.2)',
                  },
            ]}
          >
            <ListChecks size={14} color={hasTask ? '#8B5CF6' : '#A78BFA'} />
            <Text
              style={[
                styles.taskPillText,
                { color: hasTask ? '#7C3AED' : '#8B5CF6', opacity: hasTask ? 1 : 0.75 },
              ]}
              numberOfLines={1}
            >
              {hasTask ? activeSessionTask.title : 'No task — tap to pick'}
            </Text>
            {hasTask && !isRunning && (
              <TouchableOpacity onPress={handleClearTask} hitSlop={8}>
                <X size={14} color="#8B5CF6" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.ringWrapper}>
            <TimerRing
              totalSeconds={totalSeconds}
              timeLeft={timeLeft}
              isRunning={isRunning}
            />
          </View>

          {/* Duration chips */}
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((mins) => {
              const active = durationMinutes === mins;
              const disabled = isRunning;
              return (
                <TouchableOpacity
                  key={mins}
                  onPress={() => handleDurationChange(mins)}
                  disabled={disabled}
                  activeOpacity={0.75}
                  style={[
                    styles.durationChip,
                    active
                      ? {
                          backgroundColor: 'rgba(139,92,246,0.18)',
                          borderColor: '#8B5CF6',
                          shadowColor: '#8B5CF6',
                          shadowOpacity: 0.35,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 3 },
                          elevation: 4,
                        }
                      : {
                          backgroundColor: isDark
                            ? 'rgba(139,92,246,0.08)'
                            : 'rgba(139,92,246,0.06)',
                          borderColor: 'rgba(139,92,246,0.2)',
                        },
                    disabled && !active && { opacity: 0.4 },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationText,
                      {
                        color: active ? '#7C3AED' : '#A78BFA',
                        fontWeight: active ? '900' : '700',
                      },
                    ]}
                  >
                    {mins}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ControlButtons
            isRunning={isRunning}
            onReset={handleReset}
            onTogglePlay={handleTogglePlay}
            onOpenSound={handleOpenSoundSheet}
          />

          {/* Stats row — gradient */}
          <LinearGradient
            colors={['#8B5CF6', '#6366F1', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsRow}
          >
            <View style={styles.statCell}>
              <Clock3 color="#E9D5FF" size={18} />
              <Text style={styles.statValue}>{completedSessionsCount}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statCell}>
              <Zap color="#FCD34D" size={18} fill="#FCD34D" />
              <Text style={styles.statValue}>{totalMinutesAllTime}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
          </LinearGradient>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      <SoundBottomSheet
        sheetRef={soundSheetRef}
        sounds={sounds}
        selectedSound={selectedSound}
        onSelectSound={handleSelectSound}
      />

      <TaskPickerSheet
        sheetRef={taskSheetRef}
        tasks={tasks}
        selectedTaskId={activeSessionTask?.id}
        onSelectTask={handleSelectTask}
        onClearTask={handleClearTask}
      />

      <SessionReflectionModal
        visible={showReflection}
        minutesCompleted={completedSessionMinutes}
        onSave={handleSaveReflection}
        onSkip={handleSkipReflection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    alignItems: 'center',
  },
  header: { width: '100%', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 },
  subtitle: { fontSize: 14, marginTop: 6, letterSpacing: 0.4, fontWeight: '700' },

  taskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    maxWidth: '90%',
    marginBottom: 8,
  },
  taskPillText: { fontSize: 13, fontWeight: '700', maxWidth: 240 },

  ringWrapper: { marginTop: 10 },

  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    marginBottom: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 54,
    alignItems: 'center',
  },
  durationText: { fontSize: 13, letterSpacing: 0.3 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    marginTop: 6,
    marginBottom: 18,
    overflow: 'hidden',
    minWidth: 260,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 22,
    gap: 4,
  },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, color: '#FFFFFF' },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  divider: { width: 1.5, height: 46, backgroundColor: 'rgba(255,255,255,0.28)' },
});