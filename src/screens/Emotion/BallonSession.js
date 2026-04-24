import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

const TOTAL_CYCLES = 3;
const PHASE_MS = 4000;

export default function BalloonSession() {
  const { theme, isDark } = useTheme();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('Ready');
  const [cycle, setCycle] = useState(0);
  const timerRef = useRef(null);

  const scale = useSharedValue(1);
  const glow = useSharedValue(0.6);
  const floatY = useSharedValue(0);

  const stopSession = () => {
    setRunning(false);
    setPhase('Ready');
    setCycle(0);
    if (timerRef.current) clearInterval(timerRef.current);
    scale.value = withTiming(1, { duration: 380 });
    glow.value = withTiming(0.6, { duration: 380 });
  };

  useEffect(() => {
    floatY.value = withRepeat(withSequence(withTiming(-8, { duration: 2200, easing: Easing.inOut(Easing.ease) }), withTiming(8, { duration: 2200, easing: Easing.inOut(Easing.ease) })), -1, true);
  }, [floatY]);

  useEffect(() => {
    if (!running) return undefined;

    let completedCycles = 0;
    let inhale = true;
    setPhase('Inhale');
    scale.value = withTiming(1.22, { duration: PHASE_MS, easing: Easing.inOut(Easing.ease) });
    glow.value = withTiming(1, { duration: PHASE_MS });

    timerRef.current = setInterval(() => {
      inhale = !inhale;
      setPhase(inhale ? 'Inhale' : 'Exhale');

      if (inhale) {
        completedCycles += 1;
        setCycle(completedCycles);
        if (completedCycles >= TOTAL_CYCLES) {
          stopSession();
          return;
        }
      }

      scale.value = withTiming(inhale ? 1.22 : 0.92, { duration: PHASE_MS, easing: Easing.inOut(Easing.ease) });
      glow.value = withTiming(inhale ? 1 : 0.65, { duration: PHASE_MS });
    }, PHASE_MS);

    return () => timerRef.current && clearInterval(timerRef.current);
  }, [running]);

  const balloonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: floatY.value }],
    shadowOpacity: glow.value * 0.35,
  }));

  return (
    <LinearGradient colors={theme.background} style={styles.sessionBody}>
      <Text style={[styles.sessionTitle, { color: theme.text }]}>Balloon Breathing</Text>
      <Text style={[styles.cycleText, { color: theme.textSecondary }]}>Cycle {cycle}/{TOTAL_CYCLES}</Text>
      <View style={styles.balloonArea}>
        <Animated.View style={[styles.mainBalloon, balloonStyle, { shadowColor: theme.glow }]}> 
          <LinearGradient colors={isDark ? ['#FB7185', '#EF4444'] : ['#FB7185', '#F43F5E']} style={styles.balloonFill}>
            <View style={styles.knot} />
            <View style={styles.string} />
          </LinearGradient>
        </Animated.View>
      </View>
      <Text style={[styles.phaseText, { color: theme.text }]}>{phase}</Text>
      <Pressable style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={() => (running ? stopSession() : setRunning(true))}>
        <Text style={[styles.actionText, { color: theme.text }]}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sessionBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  sessionTitle: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  cycleText: { fontSize: 14, fontWeight: '600', marginBottom: 18 },
  balloonArea: { height: 300, justifyContent: 'center', alignItems: 'center' },
  mainBalloon: { width: 160, height: 200, borderRadius: 80, alignItems: 'center', shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  balloonFill: { width: '100%', height: '100%', borderRadius: 80, alignItems: 'center' },
  knot: { position: 'absolute', bottom: -8, width: 22, height: 18, backgroundColor: '#E11D48', borderBottomLeftRadius: 11, borderBottomRightRadius: 11 },
  string: { position: 'absolute', bottom: -74, width: 2, height: 70, backgroundColor: 'rgba(148,163,184,0.7)' },
  phaseText: { fontSize: 34, fontWeight: '700', marginTop: 8 },
  actionButton: { marginTop: 30, width: 180, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontWeight: '700', fontSize: 16 },
});
