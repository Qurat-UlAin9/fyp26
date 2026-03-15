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
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(1);
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    progress.value = withTiming(timeLeft / totalSeconds, {
      duration: 280,
      easing: Easing.linear,
    });
  }, [progress, timeLeft, totalSeconds]);

  useEffect(() => {
    if (isRunning) {
      pulse.value = withRepeat(withTiming(1.04, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, true);
      glow.value = withRepeat(withTiming(0.85, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, true);
      return;
    }

    cancelAnimation(pulse);
    cancelAnimation(glow);
    pulse.value = withTiming(1, { duration: 250 });
    glow.value = withTiming(0.35, { duration: 250 });
  }, [glow, isRunning, pulse]);

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(glow.value, [0.35, 0.85], [0.25, 0.55]),
    elevation: interpolate(glow.value, [0.35, 0.85], [8, 16]),
    opacity: glow.value,
  }));

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <AnimatedView style={[styles.container, pulseStyle]}>
      <AnimatedView
        style={[
          styles.glow,
          glowStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor: theme.glow,
            backgroundColor: isDark ? 'rgba(56,189,248,0.10)' : 'rgba(59,130,246,0.10)',
          },
        ]}
      />
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#7DD3FC" />
            <Stop offset="45%" stopColor="#93C5FD" />
            <Stop offset="100%" stopColor="#A78BFA" />
          </SvgGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)'}
          strokeWidth={stroke}
          fill="none"
        />

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
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

      <View style={[styles.centerContent, { backgroundColor: isDark ? '#101A35' : '#FFFFFF' }]}>
        <Text style={[styles.timeText, { color: theme.text }]}>{`${minutes}:${seconds}`}</Text>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  timeText: {
    fontSize: 46,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
