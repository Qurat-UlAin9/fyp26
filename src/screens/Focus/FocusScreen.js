import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Audio } from 'expo-av';
import {
  Headphones,
  Lock,
  Music4,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const DEFAULT_SECONDS = 25 * 60;

const SOUND_OPTIONS = [
  { id: 'deep-focus', name: 'Deep Focus', file: require('../../../assets/sounds/forest.mp3') },
  { id: 'brown-noise', name: 'Brown Noise', file: require('../../../assets/sounds/ocean.mp3') },
  { id: 'rain-rhythm', name: 'Rain Rhythm', file: require('../../../assets/sounds/rain.mp3') },
  { id: 'soft-beats', name: 'Soft Beats', file: require('../../../assets/sounds/analog-beats.mp3') },
  { id: 'alpha-waves', name: 'Alpha Waves', file: require('../../../assets/sounds/ocean.mp3') },
];

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function TimerRing({
  timeLeft,
  totalSeconds,
  isRunning,
  theme,
  isDark,
}) {
  const size = 290;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(timeLeft / totalSeconds);
  const pulse = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(timeLeft / totalSeconds, {
      duration: 300,
      easing: Easing.linear,
    });
  }, [timeLeft, totalSeconds, progress]);

  useEffect(() => {
    if (isRunning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 950, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 950, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(0, { duration: 350 });
    }
  }, [isRunning, pulse]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.05]);
    const opacity = interpolate(pulse.value, [0, 1], [0.2, 0.45]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.timerOuterWrap}>
      <Animated.View style={[styles.timerGlow, pulseStyle]} />
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="focusRingGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#22D3EE" />
            <Stop offset="50%" stopColor={theme.accentGradient[2]} />
            <Stop offset="100%" stopColor={theme.accentGradient[0]} />
          </SvgGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.35)'}
          strokeWidth={stroke}
          fill="none"
        />

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#focusRingGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>

      <View style={[styles.timerInner, { backgroundColor: isDark ? '#111C35' : '#FFFFFF' }]}>
        <Text style={[styles.timerLabel, { color: theme.textSecondary }]}>Remaining</Text>
        <Text style={[styles.timerValue, { color: theme.text }]}>{formatTime(timeLeft)}</Text>
      </View>
    </View>
  );
}

function ControlButtons({ isRunning, onPlayPause, onReset, onOpenSound, theme, isDark }) {
  return (
    <View style={styles.controlsRow}>
      <TouchableOpacity
        onPress={onReset}
        style={[styles.sideButton, { backgroundColor: isDark ? 'rgba(15,23,42,0.78)' : '#FFFFFF' }]}
        activeOpacity={0.85}
      >
        <RotateCcw color={theme.textSecondary} size={24} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onPlayPause} style={styles.playButtonTouch} activeOpacity={0.88}>
        <LinearGradient colors={['#0EA5E9', '#3B82F6', '#6366F1']} style={styles.playButtonGradient}>
          {isRunning ? <Pause color="#FFFFFF" size={38} /> : <Play color="#FFFFFF" size={38} fill="#FFFFFF" />}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onOpenSound}
        style={[styles.sideButton, { backgroundColor: isDark ? 'rgba(15,23,42,0.78)' : '#FFFFFF' }]}
        activeOpacity={0.85}
      >
        <Headphones color={theme.textSecondary} size={24} />
      </TouchableOpacity>
    </View>
  );
}

function StatsSection({ completedSessions, totalMinutes, theme, isDark }) {
  return (
    <View
      style={[
        styles.statsCard,
        {
          backgroundColor: isDark ? 'rgba(15,23,42,0.62)' : 'rgba(255,255,255,0.92)',
          borderColor: 'rgba(125,211,252,0.35)',
        },
      ]}
    >
      <Text style={[styles.statsText, { color: theme.text }]}>
        <Text style={styles.statsValue}>{completedSessions}</Text> Completed {'  '}|{'  '}
        <Text style={styles.statsValue}>{totalMinutes}</Text> Minutes
      </Text>
    </View>
  );
}

function UnlockMusicCard({ sessionsLeft, theme, isDark }) {
  return (
    <View
      style={[
        styles.unlockCard,
        {
          backgroundColor: isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.92)',
          borderColor: 'rgba(148,163,184,0.35)',
        },
      ]}
    >
      <View style={styles.unlockIconWrap}>
        <Music4 color="#7DD3FC" size={18} />
      </View>
      <View style={styles.unlockContent}>
        <Text style={[styles.unlockTitle, { color: theme.text }]}>Unlock Music</Text>
        <Text style={[styles.unlockSubtitle, { color: theme.textSecondary }]}>
          {sessionsLeft > 0
            ? `Complete ${sessionsLeft} more sessions to unlock your playlist`
            : 'Playlist unlocked! Explore your custom focus tracks.'}
        </Text>
      </View>
      <Lock color={sessionsLeft > 0 ? '#94A3B8' : '#22C55E'} size={18} />
    </View>
  );
}

function SoundBottomSheet({
  bottomSheetRef,
  soundOptions,
  selectedSoundId,
  onSelectSound,
  isDark,
  theme,
}) {
  const snapPoints = useMemo(() => ['42%'], []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: theme.textSecondary }}
      backgroundStyle={{ backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}
    >
      <BottomSheetView style={styles.bottomSheetContent}>
        <Text style={[styles.sheetTitle, { color: theme.text }]}>Rhythmic Focus Sounds</Text>

        {soundOptions.map((option) => {
          const selected = selectedSoundId === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => onSelectSound(option)}
              style={[
                styles.soundOption,
                {
                  backgroundColor: selected
                    ? 'rgba(14,165,233,0.25)'
                    : isDark
                    ? 'rgba(30,41,59,0.75)'
                    : '#FFFFFF',
                  borderColor: selected ? '#38BDF8' : 'rgba(148,163,184,0.35)',
                },
              ]}
              activeOpacity={0.88}
            >
              <Text style={[styles.soundName, { color: theme.text }]}>{option.name}</Text>
              <Text style={[styles.soundState, { color: selected ? '#22D3EE' : theme.textSecondary }]}>
                {selected ? 'Playing' : 'Select'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BottomSheetView>
    </BottomSheet>
  );
}

export default function FocusScreen() {
  const { theme, isDark } = useTheme();

  const bottomSheetRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const sessionEndRef = useRef(null);

  const loopSoundRef = useRef(null);
  const successSoundRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(DEFAULT_SECONDS);
  const [isRunning, setIsRunning] = useState(false);

  const [selectedSoundId, setSelectedSoundId] = useState(null);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [completionMessage, setCompletionMessage] = useState('');

  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const stopLoopingSound = useCallback(async () => {
    if (loopSoundRef.current) {
      await loopSoundRef.current.stopAsync();
      await loopSoundRef.current.unloadAsync();
      loopSoundRef.current = null;
    }
  }, []);

  const playSuccessSound = useCallback(async () => {
    if (successSoundRef.current) {
      await successSoundRef.current.unloadAsync();
      successSoundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../../assets/sounds/analog-beats.mp3'),
      { shouldPlay: true, isLooping: false, volume: 0.35 }
    );
    successSoundRef.current = sound;

    setTimeout(async () => {
      if (successSoundRef.current) {
        await successSoundRef.current.stopAsync();
        await successSoundRef.current.unloadAsync();
        successSoundRef.current = null;
      }
    }, 1200);
  }, []);

  const handleSessionCompleted = useCallback(async () => {
    setIsRunning(false);
    setCompletedSessions((prev) => prev + 1);
    setTotalMinutes((prev) => prev + DEFAULT_SECONDS / 60);
    setCompletionMessage('Great job! Focus session completed.');
    await playSuccessSound();
  }, [playSuccessSound]);

  const startTimer = useCallback(() => {
    if (isRunning || timeLeft <= 0) return;

    setCompletionMessage('');
    sessionEndRef.current = Date.now() + timeLeft * 1000;
    setIsRunning(true);

    timerIntervalRef.current = setInterval(() => {
      if (!sessionEndRef.current) return;

      const remaining = Math.max(
        0,
        Math.ceil((sessionEndRef.current - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearTimerInterval();
        handleSessionCompleted();
      }
    }, 250);
  }, [isRunning, timeLeft, clearTimerInterval, handleSessionCompleted]);

  const pauseTimer = useCallback(() => {
    if (!isRunning || !sessionEndRef.current) return;

    const remaining = Math.max(
      0,
      Math.ceil((sessionEndRef.current - Date.now()) / 1000)
    );

    clearTimerInterval();
    sessionEndRef.current = null;
    setTimeLeft(remaining);
    setIsRunning(false);
  }, [isRunning, clearTimerInterval]);

  const togglePlayPause = useCallback(() => {
    if (isRunning) {
      pauseTimer();
      return;
    }

    if (timeLeft === 0) {
      setTimeLeft(DEFAULT_SECONDS);
    }
    startTimer();
  }, [isRunning, pauseTimer, startTimer, timeLeft]);

  const resetTimer = useCallback(() => {
    clearTimerInterval();
    sessionEndRef.current = null;
    setIsRunning(false);
    setTimeLeft(DEFAULT_SECONDS);
    setCompletionMessage('');
  }, [clearTimerInterval]);

  const handleSelectSound = useCallback(
    async (option) => {
      setSelectedSoundId(option.id);

      await stopLoopingSound();

      const { sound } = await Audio.Sound.createAsync(option.file, {
        shouldPlay: true,
        isLooping: true,
        volume: 0.5,
      });

      loopSoundRef.current = sound;
    },
    [stopLoopingSound]
  );

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  useEffect(
    () => () => {
      clearTimerInterval();
      stopLoopingSound();

      if (successSoundRef.current) {
        successSoundRef.current.stopAsync();
        successSoundRef.current.unloadAsync();
        successSoundRef.current = null;
      }
    },
    [clearTimerInterval, stopLoopingSound]
  );

  const sessionsLeft = Math.max(0, 3 - completedSessions);

  return (
    <LinearGradient
      colors={isDark ? ['#020617', '#0F172A', '#1E293B'] : ['#E0F2FE', '#F0F9FF', '#F8FAFC']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>Focus Session</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Stay present. One task at a time.</Text>

        <TimerRing
          timeLeft={timeLeft}
          totalSeconds={DEFAULT_SECONDS}
          isRunning={isRunning}
          theme={theme}
          isDark={isDark}
        />

        <ControlButtons
          isRunning={isRunning}
          onPlayPause={togglePlayPause}
          onReset={resetTimer}
          onOpenSound={() => bottomSheetRef.current?.expand()}
          theme={theme}
          isDark={isDark}
        />

        {!!completionMessage && (
          <Text style={styles.completionMessage}>{completionMessage}</Text>
        )}

        <StatsSection
          completedSessions={completedSessions}
          totalMinutes={totalMinutes}
          theme={theme}
          isDark={isDark}
        />

        <UnlockMusicCard sessionsLeft={sessionsLeft} theme={theme} isDark={isDark} />
      </View>

      <SoundBottomSheet
        bottomSheetRef={bottomSheetRef}
        soundOptions={SOUND_OPTIONS}
        selectedSoundId={selectedSoundId}
        onSelectSound={handleSelectSound}
        isDark={isDark}
        theme={theme}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  timerOuterWrap: {
    width: 290,
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  timerGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(56,189,248,0.24)',
  },
  timerInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.4)',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  controlsRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  sideButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  playButtonTouch: {
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  playButtonGradient: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionMessage: {
    marginTop: 10,
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsValue: {
    fontWeight: '800',
  },
  unlockCard: {
    marginTop: 14,
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(14,165,233,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  unlockContent: {
    flex: 1,
    paddingRight: 10,
  },
  unlockTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  unlockSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  soundOption: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soundName: {
    fontSize: 15,
    fontWeight: '600',
  },
  soundState: {
    fontSize: 12,
    fontWeight: '600',
  },
});
