import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const PORTALS = [
  {
    title: 'Immediate Relief',
    subtitle: 'Short-term',
    glowColor: 'rgba(96, 165, 250, 0.95)',
    style: { top: 18, left: 26 },
    routeTitle: 'Immediate Relief',
  },
  {
    title: 'Mindful Growth',
    subtitle: 'Long-term',
    glowColor: 'rgba(250, 204, 21, 0.95)',
    style: { top: 188, right: 20 },
    routeTitle: 'Mindful Growth',
  },
  {
    title: 'Cognitive Power',
    subtitle: 'Training',
    glowColor: 'rgba(192, 132, 252, 0.95)',
    style: { top: 300, left: 18 },
    routeTitle: 'Cognitive Power',
  },
];

function Portal({ config, index, onPress }) {
  const floatOffset = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const spin = useSharedValue(0);
  const sparkle = useSharedValue(0.5);

  useEffect(() => {
    floatOffset.value = withRepeat(
      withSequence(
        withTiming(-8 - index * 1.2, { duration: 2600 + index * 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(7 + index, { duration: 2600 + index * 220, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    if (config.title === 'Immediate Relief') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.96, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }

    if (config.title === 'Mindful Growth') {
      spin.value = withRepeat(withTiming(360, { duration: 8200, easing: Easing.linear }), -1, false);
    }

    if (config.title === 'Cognitive Power') {
      sparkle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: 650, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [config.title, floatOffset, index, pulseScale, sparkle, spin]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatOffset.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 0.55 + (pulseScale.value - 0.95) * 2.5,
  }));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
  }));

  return (
    <Animated.View style={[styles.portalWrap, config.style, floatingStyle]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.portalTouchableArea}>
          {config.title === 'Immediate Relief' && (
            <Animated.View style={[styles.pulseGlow, { borderColor: config.glowColor }, pulseStyle]} />
          )}

          {config.title === 'Mindful Growth' && (
            <Animated.View style={[styles.rotateGlow, { borderColor: config.glowColor }, spinStyle]} />
          )}

          {config.title === 'Cognitive Power' && (
            <>
              <Animated.View style={[styles.spark, styles.sparkTop, { backgroundColor: config.glowColor }, sparkleStyle]} />
              <Animated.View
                style={[
                  styles.spark,
                  styles.sparkRight,
                  { backgroundColor: config.glowColor },
                  sparkleStyle,
                ]}
              />
              <Animated.View
                style={[
                  styles.spark,
                  styles.sparkLeft,
                  { backgroundColor: config.glowColor },
                  sparkleStyle,
                ]}
              />
            </>
          )}

          <BlurView intensity={42} tint="dark" style={styles.portalGlass}>
            <LinearGradient
              colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)']}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
              style={styles.portalGradient}
            >
              <Text style={styles.portalTitle}>{config.title}</Text>
              <Text style={styles.portalSubtitle}>{config.subtitle}</Text>
            </LinearGradient>
          </BlurView>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function EmotionRegulationScreen({ navigation }) {
  const { theme } = useTheme();
  const { profile } = useAppData();

  return (
    <LinearGradient
      colors={theme.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.meshBlobOne} />
      <View style={styles.meshBlobTwo} />
      <View style={styles.meshBlobThree} />

      <TouchableOpacity style={[styles.backBtn, { borderColor: theme.border }]} onPress={() => navigation.goBack()}>
        <ChevronLeft color={theme.text} size={20} />
      </TouchableOpacity>
      <Text style={[styles.header, { color: theme.text }]}>Explore your inner space, {profile.name || 'Friend'}</Text>

      <View style={styles.portalsStage}>
        {PORTALS.map((portal, index) => (
          <Portal
            key={portal.title}
            config={portal}
            index={index}
            onPress={() =>
              portal.title === 'Immediate Relief'
                ? navigation.navigate('ImmediateRelief')
                : portal.title === 'Mindful Growth'
                ? navigation.navigate('MindfulGrowth')
                : navigation.navigate('CognitivePower')
            }
          />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 52,
    paddingHorizontal: 22,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 30,
    lineHeight: 36,
  },
  portalsStage: {
    flex: 1,
    position: 'relative',
    paddingTop: 6,
  },
  portalWrap: {
    position: 'absolute',
  },
  portalTouchableArea: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalGlass: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  portalGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  portalTitle: {
    color: '#F8FAFC',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  portalSubtitle: {
    color: 'rgba(226,232,240,0.88)',
    fontSize: 14,
    fontWeight: '500',
  },
  pulseGlow: {
    position: 'absolute',
    width: 174,
    height: 174,
    borderRadius: 87,
    borderWidth: 2,
    shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 9,
  },
  rotateGlow: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 2,
    borderStyle: 'dashed',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 8,
  },
  spark: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  sparkTop: { top: 10, left: 84 },
  sparkRight: { top: 44, right: 14 },
  sparkLeft: { bottom: 38, left: 14 },
  meshBlobOne: {
    position: 'absolute',
    top: 95,
    left: -40,
    width: 215,
    height: 215,
    borderRadius: 120,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
  },
  meshBlobTwo: {
    position: 'absolute',
    bottom: 115,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 130,
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
  },
  meshBlobThree: {
    position: 'absolute',
    top: 290,
    right: 48,
    width: 120,
    height: 120,
    borderRadius: 80,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
});
