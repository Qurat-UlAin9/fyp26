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
  withTiming,
} from 'react-native-reanimated';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

const GAMES = [
  { id: 'nback', title: 'N-Back Challenge', icon: BrainCircuit, route: 'NBackGame' },
  { id: 'memory', title: 'Memory Match', icon: Stars, route: 'PatternRecallGame' },
  { id: 'stroop', title: 'Stroop Challenge', icon: Palette, route: 'StroopGame' },
];

function PreviewPulse({ color = '#A78BFA' }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.88, 1.08]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.62, 1]),
  }));

  return <Animated.View style={[styles.previewDot, { backgroundColor: color }, style]} />;
}

function PowerCard({ item, delay, onPress }) {
  const Icon = item.icon;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(520)} style={styles.cardWrap}>
      <Pressable onPress={onPress} style={styles.cardPressable}>
        <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
          <LinearGradient colors={['rgba(139,92,246,0.28)', 'rgba(15,23,42,0.58)']} style={styles.card}>
            <View style={styles.headRow}>
              <Icon color="#DDD6FE" size={18} strokeWidth={1.5} />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>

            <View style={styles.content}>
              <PreviewPulse color={item.id === 'stroop' ? '#F472B6' : item.id === 'memory' ? '#FDE68A' : '#A78BFA'} />
            </View>

            <Text style={styles.openText}>Play</Text>
          </LinearGradient>
        </BlurView>
      </Pressable>
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
          {GAMES.map((game, index) => (
            <PowerCard key={game.id} item={game} delay={50 + index * 70} onPress={() => navigation.navigate(game.route)} />
          ))}
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
    minHeight: 210,
    alignSelf: 'center',
  },
  cardPressable: { flex: 1 },
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
  previewDot: {
    width: 58,
    height: 58,
    borderRadius: 999,
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  openText: { color: '#DDD6FE', fontWeight: '700', fontSize: 13 },
});
