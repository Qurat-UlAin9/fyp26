import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export default function BackgroundOrb({
  size = 240,
  color = 'rgba(56,189,248,0.22)',
  top = 0,
  left,
  right,
  drift = 24,
  duration = 9000,
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [duration, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [-drift, drift]);
    const translateY = interpolate(progress.value, [0, 1], [drift * 0.6, -drift * 0.6]);

    return {
      transform: [{ translateX }, { translateY }, { scale: 0.96 + progress.value * 0.1 }],
      opacity: 0.42,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
          right,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 0,
  },
});
