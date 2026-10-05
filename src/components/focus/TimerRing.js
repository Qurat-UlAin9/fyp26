import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function TimerRing({ totalSeconds, timeLeft, isRunning }) {
  const { isDark } = useTheme();

  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const progress = Math.max(0, Math.min(1, timeLeft / totalSeconds));
  const progressPercent = Math.round((1 - progress) * 100);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const outerGlow = useSharedValue(0);

  useEffect(() => {
    if (isRunning) {
      pulse.value = withRepeat(
        withTiming(1.035, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      glow.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      outerGlow.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulse);
      cancelAnimation(glow);
      cancelAnimation(outerGlow);
      pulse.value = withTiming(1, { duration: 300 });
      glow.value = withTiming(0, { duration: 300 });
      outerGlow.value = withTiming(0, { duration: 300 });
    }
  }, [glow, isRunning, outerGlow, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.15, 0.5]),
    elevation: interpolate(glow.value, [0, 1], [4, 14]),
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(outerGlow.value, [0, 1], [0, 0.55]),
    transform: [{ scale: interpolate(outerGlow.value, [0, 1], [1, 1.06]) }],
  }));

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  // Border-based arc:
  //   - base circle = translucent track
  //   - overlay circle = gradient-colored arcs, rotated to indicate progress
  //   - full circle rendered; a mask hides the "unfilled" section via rotation
  const dashDeg = Math.max(0, Math.min(360, (1 - progress) * 360));

  return (
    <AnimatedView style={[styles.container, pulseStyle]}>
      {/* Outer glow ring */}
      <AnimatedView
        style={[
          styles.outerGlow,
          outerGlowStyle,
          {
            width: size + 36,
            height: size + 36,
            borderRadius: (size + 36) / 2,
            backgroundColor: isDark
              ? 'rgba(56,189,248,0.06)'
              : 'rgba(59,130,246,0.06)',
          },
        ]}
      />

      {/* Track circle */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
        }}
      />

      {/* Progress arcs — two half-rings, rotated to show progress */}
      {/* Right half (0° to 180°) */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderTopColor: 'transparent',
          borderLeftColor: 'transparent',
          borderRightColor: '#60A5FA',
          borderBottomColor: 'transparent',
          transform: [{ rotate: `${progress <= 0.5 ? progress * 360 : 180}deg` }],
        }}
      />
      {/* Left half (180° to 360°) — only visible when progress > 0.5 */}
      {progress > 0.5 && (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderTopColor: '#A78BFA',
            borderRightColor: 'transparent',
            borderLeftColor: '#22D3EE',
            borderBottomColor: 'transparent',
            transform: [{ rotate: `${(progress - 0.5) * 360}deg` }],
          }}
        />
      )}

      {/* Center content */}
      <AnimatedView
        style={[
          styles.centerContent,
          innerGlowStyle,
          {
            backgroundColor: isDark ? '#070E1E' : '#FFFFFF',
            shadowColor: '#38BDF8',
          },
        ]}
      >
        <Text style={[styles.timeText, { color: isDark ? '#E0F2FE' : '#0F172A' }]}>
          {`${minutes}:${seconds}`}
        </Text>
        <Text
          style={[
            styles.progressLabel,
            { color: isDark ? '#334155' : '#94A3B8' },
          ]}
        >
          {isRunning
            ? `${progressPercent}% elapsed`
            : timeLeft === 0
              ? 'Complete!'
              : 'Ready'}
        </Text>
      </AnimatedView>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 260,
    height: 260,
  },
  outerGlow: {
    position: 'absolute',
  },
  centerContent: {
    width: 172,
    height: 172,
    borderRadius: 86,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  timeText: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: 1,
    includeFontPadding: false,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});