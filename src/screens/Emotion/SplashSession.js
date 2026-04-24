import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Droplets } from 'lucide-react-native';

const Ripple = ({ delay }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withDelay(delay, withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) })),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.5, 2.5]) }],
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.4, 0]),
  }));

  return <Animated.View style={[styles.ripple, style]} />;
};

const FallingDrop = ({ delay, xPos }) => {
  const fall = useSharedValue(-20);

  useEffect(() => {
    fall.value = withRepeat(
      withDelay(delay, withTiming(180, { duration: 1500, easing: Easing.in(Easing.quad) })),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: fall.value }],
    opacity: interpolate(fall.value, [-20, 150, 180], [0, 1, 0]),
  }));

  return (
    <Animated.View style={[styles.dropPart, { left: xPos }, style]}>
        <Droplets size={18} color="#60A5FA" fill="#60A5FA" />
    </Animated.View>
  );
};

export default function SplashSession({ navigation, onClose }) {
  const [running, setRunning] = useState(false);
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    let interval;
    if (running && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      if (onClose) onClose(); else navigation.goBack();
    }
    return () => clearInterval(interval);
  }, [running, timer]);

  return (
    <View style={styles.sessionBody}>
      <Text style={styles.sessionTitle}>Splash Relief</Text>
      <Text style={styles.sessionSubtitle}>Cool water resets your nervous system.</Text>

      <View style={styles.splashContainer}>
        {/* Animated Ripples */}
        <Ripple delay={0} />
        <Ripple delay={800} />
        <Ripple delay={1600} />

        {/* Falling Water Particles */}
        {running && (
          <>
            <FallingDrop delay={0} xPos={-40} />
            <FallingDrop delay={400} xPos={40} />
            <FallingDrop delay={800} xPos={0} />
          </>
        )}

        <View style={styles.iconCircle}>
          <Droplets size={80} color="#93C5FD" strokeWidth={1.5} />
        </View>
      </View>

      <View style={styles.timerBox}>
        <Text style={styles.timerText}>{timer}s</Text>
        <Text style={styles.timerLabel}>Stay with the cool sensation</Text>
      </View>

      <Pressable 
        style={[styles.actionButton, running && styles.actionButtonActive]} 
        onPress={() => setRunning(!running)}
      >
        <Text style={styles.actionText}>{running ? 'Pause' : 'Start Splash'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sessionBody: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40 },
  sessionTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '700' },
  sessionSubtitle: { color: '#94A3B8', textAlign: 'center', paddingHorizontal: 40 },
  splashContainer: { height: 300, width: '100%', justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(30, 58, 138, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  ripple: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#60A5FA',
  },
  dropPart: { position: 'absolute', top: 0 },
  timerBox: { alignItems: 'center' },
  timerText: { color: '#F8FAFC', fontSize: 48, fontWeight: '800' },
  timerLabel: { color: '#60A5FA', fontSize: 16, fontWeight: '500' },
  actionButton: {
    width: 200,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowRadius: 15,
    shadowOpacity: 0.4,
  },
  actionButtonActive: { backgroundColor: '#1E40AF', opacity: 0.8 },
  actionText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
