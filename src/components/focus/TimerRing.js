import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.createAnimatedComponent(View);

export default function TimerRing({ totalSeconds, timeLeft, isRunning }) {
  const { theme, isDark } = useTheme();

  const size = 280;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(1);
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const outerGlow = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(timeLeft / totalSeconds, {
      duration: 280,
      easing: Easing.linear,
    });
  }, [progress, timeLeft, totalSeconds]);

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

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0, 1], [0.2, 0.65]),
    elevation: interpolate(glow.value, [0, 1], [6, 20]),
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(outerGlow.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(outerGlow.value, [0, 1], [1, 1.06]) }],
  }));

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const progressPercent = Math.round((1 - timeLeft / totalSeconds) * 100);

  return (
    <AnimatedView style={[styles.container, pulseStyle]}>
      {/* Outer glow ring */}
      <AnimatedView
        style={[
          styles.outerGlow,
          outerGlowStyle,
          {
            width: size + 40,
            height: size + 40,
            borderRadius: (size + 40) / 2,
            backgroundColor: isDark ? 'rgba(56,189,248,0.06)' : 'rgba(59,130,246,0.06)',
          },
        ]}
      />

      {/* Mid glow */}
      <AnimatedView
        style={[
          styles.outerGlow,
          {
            width: size + 16,
            height: size + 16,
            borderRadius: (size + 16) / 2,
            backgroundColor: isDark ? 'rgba(56,189,248,0.08)' : 'rgba(59,130,246,0.08)',
          },
        ]}
      />

      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#22D3EE" />
            <Stop offset="40%" stopColor="#60A5FA" />
            <Stop offset="80%" stopColor="#A78BFA" />
            <Stop offset="100%" stopColor="#F472B6" />
          </SvgGradient>
          <SvgGradient id="trackGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'} />
            <Stop offset="100%" stopColor={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)'} />
          </SvgGradient>
        </Defs>

        {/* Track ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)'}
          strokeWidth={stroke}
          fill="none"
        />

        {/* Progress ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={ringAnimatedProps}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>

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
        <Text style={[styles.progressLabel, { color: isDark ? '#334155' : '#94A3B8' }]}>
          {isRunning ? `${progressPercent}% elapsed` : timeLeft === 0 ? 'Complete!' : 'Ready'}
        </Text>
      </AnimatedView>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 280,
  },
  outerGlow: {
    position: 'absolute',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    width: 184,
    height: 184,
    borderRadius: 92,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 1.5,
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