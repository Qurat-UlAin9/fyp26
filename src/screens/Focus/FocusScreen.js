import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import TimerRing from '../../components/focus/TimerRing';
import ControlButtons from '../../components/focus/ControlButtons';
import SoundBottomSheet from '../../components/focus/SoundBottomSheet';
import StatsSection from '../../components/focus/StatsSection';
import UnlockMusicCard from '../../components/focus/UnlockMusicCard';

const DEFAULT_TIMER_SECONDS = 25 * 60;

const SOUND_OPTIONS = [
  { key: 'deep-focus', label: 'Deep Focus', source: require('../../../assets/sounds/analog-beats.mp3') },
  { key: 'brown-noise', label: 'Brown Noise', source: require('../../../assets/sounds/forest.mp3') },
  { key: 'rain-rhythm', label: 'Rain Rhythm', source: require('../../../assets/sounds/rain.mp3') },
  { key: 'soft-beats', label: 'Soft Beats', source: require('../../../assets/sounds/ocean.mp3') },
  { key: 'alpha-waves', label: 'Alpha Waves', source: require('../../../assets/sounds/analog-beats.mp3') },
];

export default function FocusScreen() {
  const { theme } = useTheme();

  const soundSheetRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const timerEndAtRef = useRef(null);
  const activeSoundRef = useRef(null);

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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
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
    timerEndAtRef.current = null;
    setIsRunning(false);
    setTimeLeft(0);
    setCompletedSessions((prev) => prev + 1);
    setTotalMinutes((prev) => prev + DEFAULT_TIMER_SECONDS / 60);
    setCompletionMessage('Great job! Focus session completed.');

    Audio.Sound.createAsync(require('../../../assets/sounds/ocean.mp3'), { shouldPlay: true, isLooping: false })
      .then(({ sound }) => {
        setTimeout(() => {
          sound.unloadAsync().catch(() => {});
        }, 1600);
      })
      .catch(() => {});

    Alert.alert('Session Complete', 'Great job! Focus session completed.');
  }, [clearTimerInterval]);

  const startTimer = useCallback(() => {
    if (isRunning || timeLeft <= 0) {
      return;
    }

    setCompletionMessage('');
    setIsRunning(true);
    timerEndAtRef.current = Date.now() + timeLeft * 1000;

    clearTimerInterval();
    timerIntervalRef.current = setInterval(() => {
      const remainingMs = (timerEndAtRef.current || Date.now()) - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(nextSeconds);

      if (nextSeconds <= 0) {
        onTimerComplete();
      }
    }, 250);
  }, [clearTimerInterval, isRunning, onTimerComplete, timeLeft]);

  const pauseTimer = useCallback(() => {
    if (!isRunning) {
      return;
    }

    const remainingMs = (timerEndAtRef.current || Date.now()) - Date.now();
    setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    setIsRunning(false);
    timerEndAtRef.current = null;
    clearTimerInterval();
  }, [clearTimerInterval, isRunning]);

  const handleTogglePlay = useCallback(() => {
    if (isRunning) {
      pauseTimer();
      return;
    }

    if (timeLeft === 0) {
      setTimeLeft(DEFAULT_TIMER_SECONDS);
    }

    startTimer();
  }, [isRunning, pauseTimer, startTimer, timeLeft]);

  const handleReset = useCallback(() => {
    clearTimerInterval();
    timerEndAtRef.current = null;
    setIsRunning(false);
    setTimeLeft(DEFAULT_TIMER_SECONDS);
    setCompletionMessage('');
  }, [clearTimerInterval]);

  const handleSelectSound = useCallback(async (soundKey) => {
    const selected = sounds.find((item) => item.key === soundKey);
    if (!selected) {
      return;
    }

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
    } catch (error) {
      Alert.alert('Audio Error', 'Unable to play this sound right now.');
    }
  }, [sounds]);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>Focus Session</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Stay present. One task at a time.</Text>

          <View style={styles.ringWrapper}>
            <TimerRing totalSeconds={DEFAULT_TIMER_SECONDS} timeLeft={timeLeft} isRunning={isRunning} />
          </View>

          <ControlButtons
            isRunning={isRunning}
            onReset={handleReset}
            onTogglePlay={handleTogglePlay}
            onOpenSound={() => soundSheetRef.current?.expand()}
          />

          <StatsSection completedSessions={completedSessions} totalMinutes={totalMinutes} />
          <UnlockMusicCard completedSessions={completedSessions} />

          {!!completionMessage && <Text style={[styles.completionText, { color: '#38BDF8' }]}>{completionMessage}</Text>}
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    marginBottom: 24,
  },
  ringWrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  completionText: {
    marginTop: 20,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});
