import React, { useEffect } from 'react';
import { Dimensions, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AudioLines, ChevronLeft, CloudSun, Flower2 } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

function ZenLotus() {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false);
  }, [spin]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  return (
    <Animated.View style={[styles.iconOrb, spinStyle]}>
      <Flower2 color="#FDE68A" size={56} strokeWidth={1.5} />
    </Animated.View>
  );
}

function ReframeFlip() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [progress]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${progress.value * 180}deg` }],
    opacity: progress.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${180 + progress.value * 180}deg` }],
    opacity: progress.value > 0.5 ? 1 : 0,
  }));

  return (
    <View style={styles.flipWrap}>
      <Animated.View style={[styles.flipFace, frontStyle]}>
        <Text style={styles.flipText}>☁️</Text>
      </Animated.View>
      <Animated.View style={[styles.flipFace, backStyle]}>
        <Text style={styles.flipText}>☀️</Text>
      </Animated.View>
    </View>
  );
}

function SoundBar({ progress, idx }) {
  const barStyle = useAnimatedStyle(() => ({
    height: 26 + Math.abs(Math.sin((progress.value + idx * 0.2) * Math.PI * 2)) * 54,
  }));

  return <Animated.View style={[styles.bar, barStyle]} />;
}

function SoundBars() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, true);
  }, [progress]);

  return (
    <View style={styles.barsWrap}>
      {[0, 1, 2, 3, 4].map((idx) => (
        <SoundBar key={`bar-${idx}`} progress={progress} idx={idx} />
      ))}
    </View>
  );
}

function GrowthCard({ title, desc, icon: Icon, children, delay }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(550)} style={styles.cardWrap}>
      <BlurView intensity={45} tint="dark" style={styles.cardBlur}>
        <LinearGradient colors={['rgba(251,191,36,0.18)', 'rgba(15,23,42,0.62)']} style={styles.card}>
          <View style={styles.row}>
            <Icon color="#FDE68A" size={20} strokeWidth={1.5} />
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <Text style={styles.cardDesc}>{desc}</Text>
          {children}
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

export default function MindfulGrowthScreen({ navigation }) {
  return (
    <LinearGradient colors={['#020617', '#0f172a']} style={styles.container}>
      <BackgroundOrb size={250} color="rgba(251,191,36,0.2)" top={60} left={-45} />
      <BackgroundOrb size={230} color="rgba(245,158,11,0.16)" top={380} right={-65} duration={10500} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.duration(460)} style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft color="#F8FAFC" size={20} strokeWidth={1.5} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Mindful Growth</Text>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <GrowthCard title="Guided Meditation" desc="Slow down, settle attention, and reset." icon={Flower2} delay={50}>
            <ZenLotus />
          </GrowthCard>

          <GrowthCard title="Thought Reframing" desc="Shift from automatic negative thoughts." icon={CloudSun} delay={140}>
            <ReframeFlip />
          </GrowthCard>

          <GrowthCard title="Nature Soundscapes" desc="Use ambient sounds to anchor your focus." icon={AudioLines} delay={220}>
            <SoundBars />
          </GrowthCard>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: 14 },
  headerRow: { paddingHorizontal: 20, marginBottom: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { color: '#F8FAFC', fontSize: 15 },
  title: { color: '#FEF3C7', fontSize: 30, fontWeight: '700' },
  scrollContent: { paddingBottom: 34, paddingTop: 10 },
  cardWrap: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cardBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.36)',
  },
  card: { borderRadius: 24, padding: 22, minHeight: 220 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#FEF3C7', fontSize: 22, fontWeight: '700' },
  cardDesc: { color: 'rgba(254,243,199,0.84)', marginTop: 10, marginBottom: 16 },
  iconOrb: {
    alignSelf: 'center',
    width: 122,
    height: 122,
    borderRadius: 61,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.46)',
    backgroundColor: 'rgba(251,191,36,0.14)',
  },
  flipWrap: { height: 120, alignItems: 'center', justifyContent: 'center' },
  flipFace: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.42)',
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  flipText: { fontSize: 44 },
  barsWrap: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  bar: {
    width: 12,
    borderRadius: 999,
    backgroundColor: '#FCD34D',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
