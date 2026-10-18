import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Play, Pause, RotateCcw, ChevronDown, ChevronUp, Brain } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { coinsForGameScore } from '../../utils/gameRewards';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TOTAL_CYCLES = 10;
const CYCLE_MS = 1200;

const SCIENCE_TEXT = `Why this works

This exercise asks your left and right hands to hold different gestures at the same time. Doing that forces both hemispheres of your brain to talk to each other through the corpus callosum — the bridge between them.

For ADHD brains, this kind of cross-lateral coordination has been shown to help with:
• Sustained attention and focus priming
• Motor sequencing, which supports task initiation
• Inhibitory control — holding one shape while the other hand moves

Think of it as a warm-up before focused work. It takes 60 seconds and primes the exact networks that task-starting relies on.

(Cite your source here — replace with a real reference from your RAG corpus, e.g. the exercise_nma_adhd_ef paper.)`;

// ------------------------------------------------------------------
// Stylized hand components (pure code, no SVG)
// ------------------------------------------------------------------

function RabbitHand({ color }) {
  return (
    <View style={styles.handBase}>
      {/* Palm */}
      <View style={[styles.palm, { backgroundColor: color }]} />
      {/* Two ears - V shape */}
      <View
        style={[
          styles.ear,
          { backgroundColor: color, transform: [{ rotate: '-14deg' }], left: 14 },
        ]}
      />
      <View
        style={[
          styles.ear,
          { backgroundColor: color, transform: [{ rotate: '14deg' }], right: 14 },
        ]}
      />
      {/* Folded fingers hint at the bottom */}
      <View style={[styles.foldHint, { backgroundColor: color }]} />
    </View>
  );
}

function HunterHand({ color }) {
  return (
    <View style={styles.handBase}>
      {/* Palm */}
      <View style={[styles.palm, { backgroundColor: color }]} />
      {/* Pointer finger - forward and slightly up */}
      <View
        style={[
          styles.pointer,
          { backgroundColor: color, transform: [{ rotate: '-82deg' }] },
        ]}
      />
      {/* Thumb - sticking up */}
      <View
        style={[
          styles.thumb,
          { backgroundColor: color, transform: [{ rotate: '-18deg' }] },
        ]}
      />
      {/* Knuckle bump for the folded middle finger */}
      <View style={[styles.knuckle, { backgroundColor: color }]} />
    </View>
  );
}

// ------------------------------------------------------------------
// Main screen
// ------------------------------------------------------------------

export default function RabbitHunterScreen({ navigation }) {
  const { theme, earnCoins } = useTheme();
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [scienceOpen, setScienceOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const cycleRef = useRef(0);
  const rewardedRef = useRef(false);
  const swapTimeoutRef = useRef(null);

  // swap = false → left = rabbit, right = hunter
  // swap = true  → left = hunter, right = rabbit
  const [swap, setSwap] = useState(false);

  const hunterRecoil = useSharedValue(0);
  const rabbitBounce = useSharedValue(0);
  const swapFade = useSharedValue(1);

  // ---- Animation cycle ----
  useEffect(() => {
    if (!running) return undefined;

    const runCycle = () => {
      // Hunter recoil
      hunterRecoil.value = withSequence(
        withTiming(-14, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) })
      );

      // Rabbit bounce
      rabbitBounce.value = withSequence(
        withTiming(-16, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) })
      );

      // Swap roles after a beat
      swapTimeoutRef.current = setTimeout(() => {
        swapFade.value = withSequence(
          withTiming(0.3, { duration: 120 }),
          withTiming(1, { duration: 220 })
        );
        setSwap((prev) => !prev);
      }, 550);
    };

    runCycle();

    const interval = setInterval(() => {
      const nextCycle = cycleRef.current + 1;
      cycleRef.current = nextCycle;
      setCycle(nextCycle);
      if (nextCycle >= TOTAL_CYCLES) {
        clearInterval(interval);
        setRunning(false);
        setCompleted(true);
        const score = nextCycle * 10;
        const reward = coinsForGameScore(score);
        if (!rewardedRef.current) {
          rewardedRef.current = true;
          earnCoins(reward);
        }
        Toast.show({
          type: 'success',
          text1: 'Exercise complete!',
          text2: `${score} points · ${reward} coins earned`,
          visibilityTime: 3000,
        });
        return;
      }
      runCycle();
    }, CYCLE_MS);

    return () => {
      clearInterval(interval);
      if (swapTimeoutRef.current) clearTimeout(swapTimeoutRef.current);
    };
  }, [running, earnCoins, hunterRecoil, rabbitBounce, swapFade]);

  const handleStart = () => {
    if (completed) {
      cycleRef.current = 0;
      setCycle(0);
      setCompleted(false);
      setSwap(false);
      rewardedRef.current = false;
    }
    setRunning(true);
  };

  const handleReset = () => {
    setRunning(false);
    cycleRef.current = 0;
    setCycle(0);
    setSwap(false);
    setCompleted(false);
    rewardedRef.current = false;
    if (swapTimeoutRef.current) clearTimeout(swapTimeoutRef.current);
    hunterRecoil.value = 0;
    rabbitBounce.value = 0;
    swapFade.value = 1;
  };

  const toggleScience = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScienceOpen((prev) => !prev);
  };

  const leftStyle = useAnimatedStyle(() => ({
    opacity: swapFade.value,
    transform: [{ translateY: swap ? hunterRecoil.value : rabbitBounce.value }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    opacity: swapFade.value,
    transform: [{ translateY: swap ? rabbitBounce.value : hunterRecoil.value }],
  }));

  const progress = Math.min(1, cycle / TOTAL_CYCLES);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { borderColor: theme.border }]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Rabbit & Hunter
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%`, backgroundColor: theme.accentGradient[0] },
            ]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
          {cycle} / {TOTAL_CYCLES} cycles · {cycle * 10} points
        </Text>
      </View>

      {/* Animation stage */}
      <View style={styles.stage}>
        <Animated.View style={[styles.handSlot, leftStyle]}>
          {swap ? (
            <HunterHand color={theme.accentGradient[0]} />
          ) : (
            <RabbitHand color={theme.accentGradient[0]} />
          )}
          <Text style={[styles.handLabel, { color: theme.textSecondary }]}>
            {swap ? 'Hunter' : 'Rabbit'}
          </Text>
        </Animated.View>

        <View style={styles.clashIndicator}>
          <Text style={[styles.clashText, { color: theme.textSecondary }]}>
            ⇄
          </Text>
        </View>

        <Animated.View style={[styles.handSlot, rightStyle]}>
          {swap ? (
            <RabbitHand color={theme.accentGradient[1]} />
          ) : (
            <HunterHand color={theme.accentGradient[1]} />
          )}
          <Text style={[styles.handLabel, { color: theme.textSecondary }]}>
            {swap ? 'Rabbit' : 'Hunter'}
          </Text>
        </Animated.View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionTitle, { color: theme.text }]}>
          {completed
            ? '🎉 Well done'
            : running
              ? 'Keep going — swap hands each beat'
              : 'Ready when you are'}
        </Text>
        <Text style={[styles.instructionBody, { color: theme.textSecondary }]}>
          Hold rabbit with one hand, hunter with the other. When the hands swap,
          switch roles. Keep both gestures clean.
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={handleReset}
        >
          <RotateCcw color={theme.accentGradient[0]} size={22} />
        </TouchableOpacity>

        <Pressable
          style={[
            styles.playBtn,
            { backgroundColor: theme.accentGradient[0] },
          ]}
          onPress={running ? () => setRunning(false) : handleStart}
        >
          {running ? (
            <Pause color="#0F172A" size={28} fill="#0F172A" />
          ) : (
            <Play color="#0F172A" size={28} fill="#0F172A" />
          )}
        </Pressable>

        <View style={{ width: 48 }} />
      </View>

      {/* Science accordion */}
      <View style={[styles.scienceCard, { borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.scienceHeader}
          onPress={toggleScience}
          activeOpacity={0.75}
        >
          <View style={styles.scienceLeft}>
            <Brain color={theme.accentGradient[0]} size={18} />
            <Text style={[styles.scienceTitle, { color: theme.text }]}>
              Why this works
            </Text>
          </View>
          {scienceOpen ? (
            <ChevronUp color={theme.textSecondary} size={18} />
          ) : (
            <ChevronDown color={theme.textSecondary} size={18} />
          )}
        </TouchableOpacity>

        {scienceOpen && (
          <View style={styles.scienceBody}>
            {SCIENCE_TEXT.split('\n\n').map((para, i) => (
              <Text
                key={i}
                style={[styles.scienceParagraph, { color: theme.textSecondary }]}
              >
                {para}
              </Text>
            ))}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },

  progressWrap: { paddingHorizontal: 24, marginBottom: 8 },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(148,163,184,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  stage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
  },
  handSlot: { alignItems: 'center', gap: 20 },
  handLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  clashIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clashText: { fontSize: 28, opacity: 0.4 },

  // Hand shapes (stylized)
  handBase: { width: 90, height: 140, alignItems: 'center', justifyContent: 'flex-end' },
  palm: {
    position: 'absolute',
    bottom: 0,
    width: 70,
    height: 80,
    borderRadius: 18,
  },
  ear: {
    position: 'absolute',
    bottom: 60,
    width: 16,
    height: 62,
    borderRadius: 8,
  },
  foldHint: {
    position: 'absolute',
    bottom: 4,
    width: 48,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
  },
  pointer: {
    position: 'absolute',
    bottom: 40,
    right: -22,
    width: 16,
    height: 58,
    borderRadius: 8,
  },
  thumb: {
    position: 'absolute',
    bottom: 62,
    left: 4,
    width: 14,
    height: 38,
    borderRadius: 7,
  },
  knuckle: {
    position: 'absolute',
    bottom: 4,
    right: 12,
    width: 24,
    height: 12,
    borderRadius: 6,
    opacity: 0.5,
  },

  instructions: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  instructionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  instructionBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 320,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  scienceCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  scienceLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scienceTitle: { fontSize: 14, fontWeight: '700' },
  scienceBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  scienceParagraph: {
    fontSize: 13,
    lineHeight: 20,
  },
});