import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export default function BalloonSession({ onClose }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState('Ready');
  const scale = useSharedValue(1);

  useEffect(() => {
    if (running) {
      setPhase('Inhale');
      scale.value = withRepeat(
        withTiming(1.8, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      // Logic to toggle text
      const interval = setInterval(() => {
        setPhase(prev => prev === 'Inhale' ? 'Exhale' : 'Inhale');
      }, 4000);
      return () => clearInterval(interval);
    } else {
      scale.value = withTiming(1);
    }
  }, [running]);

  const animatedBalloon = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.sessionBody}>
      <Text style={styles.sessionTitle}>Balloon Breathing</Text>
      <View style={styles.balloonArea}>
        <Animated.View style={[styles.mainBalloon, animatedBalloon]}>
            <View style={styles.knot} />
            <View style={styles.string} />
        </Animated.View>
      </View>
      <Text style={styles.phaseText}>{running ? phase : 'Ready'}</Text>
      <Pressable style={styles.actionButton} onPress={() => setRunning(!running)}>
        <Text style={styles.actionText}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sessionBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '700', marginBottom: 40 },
  balloonArea: { height: 300, justifyContent: 'center', alignItems: 'center' },
  mainBalloon: {
    width: 140,
    height: 170,
    borderRadius: 70,
    backgroundColor: '#FF4D4D', // Fresh Red
    alignItems: 'center',
  },
  knot: {
    position: 'absolute',
    bottom: -5,
    width: 20,
    height: 15,
    backgroundColor: '#D63030',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  string: {
    position: 'absolute',
    bottom: -65,
    width: 2,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  phaseText: { color: '#F8FAFC', fontSize: 32, fontWeight: '700', marginTop: 30 },
  actionButton: {
    marginTop: 40,
    width: 160,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: 'white', fontWeight: 'bold' },
});
