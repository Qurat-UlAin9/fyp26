import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Dimensions, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AudioLines, ChevronLeft, CloudSun, Flower2 } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.88;

const GROWTH_PATHS = [
  {
    id: 'meditation',
    title: 'Meditation Session',
    desc: 'Slow down, settle attention, and reset.',
    icon: Flower2,
    route: 'MeditationSession',
  },
  {
    id: 'reframing',
    title: 'Thought Reframing',
    desc: 'Shift automatic negative thoughts with your AI coach.',
    icon: CloudSun,
    route: 'Chatbot',
  },
  {
    id: 'soundscapes',
    title: 'Soundscapes',
    desc: 'Immersive classical tracks to support calm focus.',
    icon: AudioLines,
    route: 'Soundscapes',
  },
];

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

function GrowthCard({ item, delay, onPress }) {
  const Icon = item.icon;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(550)} style={styles.cardWrap}>
      <Pressable onPress={onPress}>
        <BlurView intensity={45} tint="dark" style={styles.cardBlur}>
          <LinearGradient colors={['rgba(251,191,36,0.18)', 'rgba(15,23,42,0.62)']} style={styles.card}>
            <View style={styles.row}>
              <Icon color="#FDE68A" size={20} strokeWidth={1.5} />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            <Text style={styles.cardDesc}>{item.desc}</Text>
            {item.id === 'reframing' ? (
              <ReframeFlip />
            ) : (
              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>Open Session</Text>
              </View>
            )}
          </LinearGradient>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

export default function MindfulGrowthScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <LinearGradient colors={theme.background} style={styles.container}>
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
          {GROWTH_PATHS.map((item, index) => (
            <GrowthCard
              key={item.id}
              item={item}
              delay={40 + index * 80}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
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
  scrollContent: { paddingBottom: 34, paddingTop: 10, alignItems: 'center', gap: 16 },
  cardWrap: { width: CARD_WIDTH },
  cardBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.36)',
  },
  card: { borderRadius: 24, padding: 22, minHeight: 210 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#FEF3C7', fontSize: 22, fontWeight: '700' },
  cardDesc: { color: 'rgba(254,243,199,0.84)', marginTop: 10, marginBottom: 16 },
  ctaRow: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.5)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ctaText: { color: '#FDE68A', fontWeight: '700', fontSize: 12, letterSpacing: 0.2 },
  flipWrap: { height: 98, alignItems: 'center', justifyContent: 'center' },
  flipFace: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.42)',
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  flipText: { fontSize: 36 },
});
