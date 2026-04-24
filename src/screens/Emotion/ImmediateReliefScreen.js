import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Droplets, Flower2, Wind, Waves } from 'lucide-react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const RELIEF_ROUTES = [
  {
    id: 'balloon',
    title: 'Balloon Session',
    subtitle: 'Slow breath to settle your body',
    icon: Wind,
    route: 'BalloonSession',
    colors: ['rgba(251,113,133,0.24)', 'rgba(15,23,42,0.62)'],
  },
  {
    id: 'splash',
    title: 'Splash Session',
    subtitle: 'A cooling reset in 30 seconds',
    icon: Droplets,
    route: 'SplashSession',
    colors: ['rgba(56,189,248,0.24)', 'rgba(15,23,42,0.62)'],
  },
  {
    id: 'grounding',
    title: 'Grounding Session',
    subtitle: '5-4-3-2-1 sensory anchor',
    icon: Flower2,
    route: 'GroundingSession',
    colors: ['rgba(196,181,253,0.22)', 'rgba(15,23,42,0.62)'],
  },
  {
    id: 'harmonic',
    title: 'Harmonic Ripples',
    subtitle: 'Tap tones for gentle emotional release',
    icon: Waves,
    route: 'HarmonicRipples',
    colors: ['rgba(45,212,191,0.2)', 'rgba(15,23,42,0.62)'],
  },
];

function ReliefCard({ item, delay, onPress }) {
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = item.icon;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(520)} style={styles.cardWrap}>
      <Animated.View style={pressStyle}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(0.98);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
          onPress={onPress}
        >
          <BlurView intensity={30} tint="dark" style={styles.cardBlur}>
            <LinearGradient colors={item.colors} style={styles.cardContent}>
              <View style={styles.iconBubble}>
                <Icon size={20} color="#E2E8F0" strokeWidth={1.8} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </LinearGradient>
          </BlurView>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function ImmediateReliefScreen({ navigation }) {
  const { theme } = useTheme();

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <BackgroundOrb size={250} color="rgba(96,165,250,0.2)" top={70} left={-80} duration={10000} />
      <BackgroundOrb size={260} color="rgba(147,197,253,0.14)" top={420} right={-90} duration={9200} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color="#E2E8F0" />
          </Pressable>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Immediate Relief</Text>
            <Text style={styles.subtitle}>Choose a quick practice for right now.</Text>
          </View>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {RELIEF_ROUTES.map((item, index) => (
            <ReliefCard
              key={item.id}
              item={item}
              delay={index * 80}
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
  safeArea: { flex: 1, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 18 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  titleWrap: { flex: 1 },
  title: { color: '#E2E8F0', fontSize: 28, fontWeight: '700' },
  subtitle: { color: 'rgba(226,232,240,0.78)', marginTop: 6, fontSize: 14 },
  scrollContent: { paddingTop: 18, paddingBottom: 30, paddingHorizontal: 16, gap: 14 },
  cardWrap: { borderRadius: 22 },
  cardBlur: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  cardContent: { borderRadius: 22, paddingHorizontal: 18, paddingVertical: 20 },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.45)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  cardTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '700' },
  cardSubtitle: { color: 'rgba(226,232,240,0.84)', marginTop: 8, fontSize: 14, lineHeight: 20 },
});
