import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { BrainCircuit, Sparkles, Wind, MessageCircleHeart, ArrowLeft } from 'lucide-react-native';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const PORTAL_ITEMS = [
  {
    id: 'immediate',
    title: 'Calm Zone',
    subtitle: 'Immediate Relief',
    description: 'Breathing, grounding, and body-first resets for emotional overload.',
    icon: Wind,
    accent: 'rgba(125, 211, 252, 0.9)',
    route: 'ImmediateRelief',
  },
  {
    id: 'cognitive',
    title: 'Mind Gym',
    subtitle: 'Cognitive Power',
    description: 'Train working memory, inhibition, and focus with quick brain games.',
    icon: BrainCircuit,
    accent: 'rgba(196, 181, 253, 0.9)',
    route: 'CognitivePower',
  },
  {
    id: 'reframing',
    title: 'Thought Reframing',
    subtitle: 'AI Guided',
    description: 'Shift stressful thoughts into balanced alternatives with your coach.',
    icon: MessageCircleHeart,
    accent: 'rgba(253, 186, 116, 0.9)',
    route: 'Chatbot',
    params: { context: 'reframing' },
  },
  {
    id: 'growth',
    title: 'Mindful Growth',
    subtitle: 'Long-Term',
    description: 'Build steady emotional habits to stay grounded over time.',
    icon: Sparkles,
    accent: 'rgba(167, 243, 208, 0.9)',
    route: 'MindfulGrowth',
  },
];

function PortalCard({ item, cardWidth, onPress }) {
  const Icon = item.icon;

  return (
    <Pressable style={[styles.cardWrap, { width: cardWidth }]} onPress={onPress}>
      <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardContent}
        >
          <View style={[styles.iconWrap, { borderColor: item.accent }]}> 
            <Icon size={20} color={item.accent} strokeWidth={1.8} />
          </View>
          <View style={styles.cardTextWrap}>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        </LinearGradient>
      </BlurView>
    </Pressable>
  );
}

export default function EmotionRegulationScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const cardWidth = width * 0.85;

  return (
    <LinearGradient
      colors={['#060918', '#0E1130', '#1A1240', '#120B32', '#060A1E']}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <BackgroundOrb size={320} color="rgba(59,130,246,0.2)" top={40} left={-100} drift={30} duration={12000} />
      <BackgroundOrb size={280} color="rgba(168,85,247,0.18)" top={220} right={-120} drift={24} duration={9800} />
      <BackgroundOrb size={240} color="rgba(14,165,233,0.16)" top={530} left={-80} drift={22} duration={10800} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color="#E2E8F0" />
          </Pressable>
          <Text style={styles.headerTitle}>Emotion Regulation</Text>
        </View>

        <Text style={styles.leadText}>Step into your portal. Choose calm now, or train for stronger focus later.</Text>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {PORTAL_ITEMS.map((item) => (
            <PortalCard
              key={item.id}
              item={item}
              cardWidth={cardWidth}
              onPress={() => navigation.navigate(item.route, item.params)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    color: '#EEF2FF',
    fontSize: 24,
    fontWeight: '700',
  },
  leadText: {
    color: 'rgba(224, 231, 255, 0.82)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
    paddingHorizontal: 18,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingBottom: 34,
    gap: 16,
  },
  cardWrap: {
    borderRadius: 24,
  },
  cardBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardContent: {
    borderRadius: 24,
    minHeight: 170,
    paddingVertical: 20,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 2,
  },
  cardTextWrap: {
    flex: 1,
  },
  subtitle: {
    color: '#BFDBFE',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: 'rgba(226, 232, 240, 0.86)',
    fontSize: 14,
    lineHeight: 20,
  },
});
