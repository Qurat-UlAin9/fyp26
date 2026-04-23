import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dimensions, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BrainCircuit, ChevronLeft, Palette, Stars } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

function FlashCell({ progress, index }) {
  const style = useAnimatedStyle(() => {
    const phase = (progress.value + index * 0.13) % 1;
    return {
      backgroundColor: phase > 0.78 ? 'rgba(196,181,253,0.9)' : 'rgba(76,29,149,0.38)',
      borderColor: phase > 0.78 ? 'rgba(233,213,255,1)' : 'rgba(196,181,253,0.4)',
      transform: [{ scale: phase > 0.78 ? 1.08 : 1 }],
    };
  });

  return <Animated.View style={[styles.gridCell, style]} />;
}

function NBackGrid() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [progress]);

  return (
    <View style={styles.gridWrap}>
      {Array.from({ length: 9 }).map((_, index) => (
        <FlashCell key={`cell-${index}`} progress={progress} index={index} />
      ))}
    </View>
  );
}

function StroopText() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      false
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.96, 1.06]) }],
  }));

  return (
    <Animated.Text style={[styles.stroopWord, style]}>
      YELLOW
    </Animated.Text>
  );
}

function Constellation() {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [glow]);

  const starStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + glow.value * 0.5,
  }));

  return (
    <View style={styles.constellationWrap}>
      <View style={styles.constellationLineOne} />
      <View style={styles.constellationLineTwo} />
      <Animated.View style={[styles.dot, { top: 18, left: 12 }, starStyle]} />
      <Animated.View style={[styles.dot, { top: 48, left: 58 }, starStyle]} />
      <Animated.View style={[styles.dot, { top: 30, right: 26 }, starStyle]} />
      <Animated.View style={[styles.dot, { bottom: 24, right: 58 }, starStyle]} />
    </View>
  );
}

function PowerCard({ title, icon: Icon, children, delay }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(520)} style={styles.cardWrap}>
      <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
        <LinearGradient colors={['rgba(139,92,246,0.28)', 'rgba(15,23,42,0.58)']} style={styles.card}>
          <View style={styles.headRow}>
            <Icon color="#DDD6FE" size={18} strokeWidth={1.5} />
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <View style={styles.content}>{children}</View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

export default function CognitivePowerScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <BackgroundOrb size={260} color="rgba(139,92,246,0.2)" top={90} left={-70} />
      <BackgroundOrb size={220} color="rgba(168,85,247,0.2)" top={380} right={-40} duration={9800} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft color="#F5F3FF" size={20} strokeWidth={1.5} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Cognitive Power</Text>
        </Animated.View>

        <View style={styles.grid}>
          <PowerCard title="N-Back Challenge" icon={BrainCircuit} delay={50}>
            <NBackGrid />
          </PowerCard>

          <PowerCard title="Stroop Effect" icon={Palette} delay={120}>
            <StroopText />
          </PowerCard>

          <PowerCard title="Pattern Recall" icon={Stars} delay={180}>
            <Constellation />
          </PowerCard>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: 14 },
  headerRow: { paddingHorizontal: 20, marginBottom: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { color: '#F5F3FF', fontSize: 15 },
  title: { color: '#EDE9FE', fontSize: 30, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingTop: 12,
    rowGap: 14,
  },
  cardWrap: {
    width: CARD_WIDTH,
    minHeight: 220,
    alignSelf: 'center',
  },
  cardBlur: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.46)',
    shadowColor: '#A78BFA',
    shadowOpacity: 0.85,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  card: { flex: 1, borderRadius: 20, padding: 14 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: '#F5F3FF', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridWrap: {
    width: 95,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  gridCell: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
  },
  stroopWord: {
    color: '#8B5CF6',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  constellationWrap: { width: 118, height: 118, position: 'relative' },
  constellationLineOne: {
    position: 'absolute',
    left: 20,
    top: 30,
    width: 76,
    borderTopWidth: 1,
    borderColor: 'rgba(216,180,254,0.6)',
    transform: [{ rotate: '12deg' }],
  },
  constellationLineTwo: {
    position: 'absolute',
    right: 26,
    top: 34,
    width: 44,
    borderTopWidth: 1,
    borderColor: 'rgba(216,180,254,0.6)',
    transform: [{ rotate: '50deg' }],
  },
  dot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E9D5FF',
    shadowColor: '#C084FC',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
