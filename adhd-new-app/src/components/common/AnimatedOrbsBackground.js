import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export default function AnimatedOrbsBackground({ colors = ['rgba(125,211,252,0.18)', 'rgba(20,184,166,0.13)', 'rgba(167,139,250,0.14)'] }) {
  const floatA = useSharedValue(0);
  const floatB = useSharedValue(0);
  const floatC = useSharedValue(0);

  useEffect(() => {
    floatA.value = withRepeat(withSequence(withTiming(-16, { duration: 5000 }), withTiming(8, { duration: 5000 })), -1, true);
    floatB.value = withRepeat(withSequence(withTiming(12, { duration: 6500 }), withTiming(-12, { duration: 6500 })), -1, true);
    floatC.value = withRepeat(withSequence(withTiming(-10, { duration: 7200 }), withTiming(10, { duration: 7200 })), -1, true);
  }, [floatA, floatB, floatC]);

  const orbA = useAnimatedStyle(() => ({ transform: [{ translateY: floatA.value }, { translateX: floatA.value * -0.4 }] }));
  const orbB = useAnimatedStyle(() => ({ transform: [{ translateY: floatB.value }, { translateX: floatB.value * 0.5 }] }));
  const orbC = useAnimatedStyle(() => ({ transform: [{ translateY: floatC.value }, { translateX: floatC.value * -0.35 }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.orb, styles.orbOne, { backgroundColor: colors[0] }, orbA]} />
      <Animated.View style={[styles.orb, styles.orbTwo, { backgroundColor: colors[1] }, orbB]} />
      <Animated.View style={[styles.orb, styles.orbThree, { backgroundColor: colors[2] }, orbC]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbOne: { width: 210, height: 210, top: -40, left: -50 },
  orbTwo: { width: 180, height: 180, top: 260, right: -45 },
  orbThree: { width: 140, height: 140, bottom: 120, left: 35 },
});
