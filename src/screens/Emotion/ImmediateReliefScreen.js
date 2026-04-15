import React, { useEffect } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, CircleDot, Droplets, Sparkles } from 'lucide-react-native';
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
const CARD_WIDTH = width * 0.85;

const RELIEF_ITEMS = [
  { id: 'breathing', title: 'Balloon Breathing', subtitle: 'Inhale for 4 · Exhale for 6', icon: CircleDot },
  { id: 'grounding', title: '5-4-3-2-1 Grounding', subtitle: 'Notice five things around you', icon: Sparkles },
  { id: 'water', title: 'Cold Water Splash', subtitle: 'Quick reset for body and mind', icon: Droplets },
];

function BalloonAnimation() {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [breathe]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breathe.value, [0, 1], [0.72, 1.08]) }],
    opacity: interpolate(breathe.value, [0, 1], [0.55, 0.95]),
  }));

  return (
    <View style={styles.animationWrap}>
      <Animated.View style={[styles.breathOuter, style]} />
      <Animated.View style={[styles.breathInner, style]} />
    </View>
  );
}

function TwinkleStar({ progress, index }) {
  const starStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + ((progress.value + index * 0.19) % 1) * 0.75,
    transform: [{ scale: 0.7 + ((progress.value + index * 0.24) % 1) * 0.5 }],
  }));

  return <Animated.View style={[styles.star, STAR_POSITIONS[index], starStyle]} />;
}

function GroundingAnimation() {
  const twinkle = useSharedValue(0);

  useEffect(() => {
    twinkle.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
  }, [twinkle]);

  return (
    <View style={styles.animationWrap}>
      {[0, 1, 2, 3, 4].map((index) => (
        <TwinkleStar key={`star-${index}`} progress={twinkle} index={index} />
      ))}
    </View>
  );
}

function WaterRippleAnimation() {
  const ripple = useSharedValue(0);

  useEffect(() => {
    ripple.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false);
  }, [ripple]);

  const dropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(ripple.value, [0, 1], [0, 6]) }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.65 + ripple.value * 0.85 }],
    opacity: 0.55 - ripple.value * 0.5,
  }));

  return (
    <View style={styles.animationWrap}>
      <Animated.View style={[styles.drop, dropStyle]} />
      <Animated.View style={[styles.rippleRing, ringStyle]} />
      <Animated.View style={[styles.rippleRing, styles.rippleRingSecond, ringStyle]} />
    </View>
  );
}

function ReliefCard({ item }) {
  const Icon = item.icon;

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.cardWrap}>
      <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
        <LinearGradient colors={['rgba(56,189,248,0.22)', 'rgba(15,23,42,0.6)']} style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon color="#7DD3FC" size={22} strokeWidth={1.5} />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>

          {item.id === 'breathing' && <BalloonAnimation />}
          {item.id === 'grounding' && <GroundingAnimation />}
          {item.id === 'water' && <WaterRippleAnimation />}
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

export default function ImmediateReliefScreen({ navigation }) {
  return (
    <LinearGradient colors={['#020617', '#0f172a']} style={styles.container}>
      <BackgroundOrb size={280} color="rgba(59,130,246,0.22)" top={70} left={-30} />
      <BackgroundOrb size={220} color="rgba(14,165,233,0.18)" top={420} right={-40} duration={11000} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft color="#E2E8F0" size={20} strokeWidth={1.5} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Immediate Relief</Text>
        </Animated.View>

        <FlatList
          data={RELIEF_ITEMS}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          renderItem={({ item }) => <ReliefCard item={item} />}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const STAR_POSITIONS = [
  { top: 22, left: 30 },
  { top: 40, right: 36 },
  { top: 66, left: 68 },
  { top: 98, right: 58 },
  { top: 108, left: 26 },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: 14 },
  headerRow: { paddingHorizontal: 20, marginBottom: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backText: { color: '#E2E8F0', fontSize: 15 },
  title: { color: '#F8FAFC', fontSize: 30, fontWeight: '700' },
  carouselContent: { paddingHorizontal: width * 0.075 },
  cardWrap: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    marginRight: width * 0.03,
  },
  cardBlur: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.45)',
  },
  card: {
    minHeight: 420,
    borderRadius: 26,
    padding: 24,
    justifyContent: 'space-between',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#E0F2FE', fontSize: 24, fontWeight: '700', flexShrink: 1 },
  cardSubtitle: { color: 'rgba(224,242,254,0.8)', marginTop: 10, fontSize: 15 },
  animationWrap: {
    marginTop: 34,
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  breathOuter: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: 'rgba(56,189,248,0.25)',
    position: 'absolute',
  },
  breathInner: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: 'rgba(125,211,252,0.66)',
  },
  star: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#BAE6FD',
    position: 'absolute',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.95,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  drop: {
    width: 42,
    height: 58,
    borderRadius: 30,
    backgroundColor: 'rgba(125,211,252,0.8)',
  },
  rippleRing: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 2,
    borderColor: 'rgba(125,211,252,0.42)',
  },
  rippleRingSecond: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderColor: 'rgba(125,211,252,0.22)',
  },
});
