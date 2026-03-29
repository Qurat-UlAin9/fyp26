import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { ShieldCheck, Zap, Brain, Heart, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ADHDButton from '../../components/common/ADHDButton';

const slides = [
  {
    title: 'Welcome to FocusMind',
    subtitle: 'Your ADHD-friendly daily companion.',
    icon: ShieldCheck,
    color: '#4F46E5',
  },
  {
    title: 'Stay Focused',
    subtitle: 'Start deep work sessions with less friction.',
    icon: Zap,
    color: '#10B981',
  },
  {
    title: 'Track Emotions',
    subtitle: 'Notice patterns and regulate with confidence.',
    icon: Brain,
    color: '#F59E0B',
  },
  {
    title: 'Build Habits',
    subtitle: 'Stack small wins into meaningful progress.',
    icon: Heart,
    color: '#EC4899',
  },
];

export default function OnboardingScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef(null);
  const { width } = useWindowDimensions();

  const cardWidth = useMemo(() => Math.max(width - 40, 280), [width]);

  const goToSlide = (index) => {
    const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
    scrollRef.current?.scrollTo({ x: safeIndex * cardWidth, animated: true });
    setCurrentSlide(safeIndex);
  };

  const next = () => {
    if (currentSlide === slides.length - 1) {
      navigation.replace('Welcome');
      return;
    }

    goToSlide(currentSlide + 1);
  };

  const back = () => goToSlide(currentSlide - 1);

  const finish = () => navigation.replace('Welcome');

  const onMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const slide = Math.round(offsetX / cardWidth);
    setCurrentSlide(slide);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={back} disabled={currentSlide === 0} style={[styles.arrowBtn, currentSlide === 0 && styles.disabled]}>
          <ChevronLeft color={currentSlide === 0 ? '#94A3B8' : theme.primary} size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={finish}>
          <Text style={[styles.skipText, { color: theme.primary }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={next}
          style={styles.arrowBtn}
        >
          <ChevronRight color={theme.primary} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        onMomentumScrollEnd={onMomentumScrollEnd}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {slides.map((slide) => {
          const Icon = slide.icon;
          return (
            <View key={slide.title} style={[styles.slide, { width: cardWidth, backgroundColor: theme.card, borderColor: theme.border }]}> 
              <View style={[styles.iconWrap, { backgroundColor: `${slide.color}20` }]}>
                <Icon size={58} color={slide.color} />
              </View>
              <Text style={[styles.slideTitle, { color: theme.text }]}>{slide.title}</Text>
              <Text style={[styles.slideSubtitle, { color: theme.textSecondary }]}>{slide.subtitle}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.dotsRow}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: currentSlide === index ? 30 : 9,
                backgroundColor: currentSlide === index ? theme.primary : theme.border,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.bottomControls}>
        <ADHDButton title={currentSlide === slides.length - 1 ? 'Get Started' : 'Next'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    paddingBottom: 28,
  },
  topRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  arrowBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(148,163,184,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  slide: {
    marginRight: 12,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 34,
    minHeight: 460,
  },
  iconWrap: {
    width: 126,
    height: 126,
    borderRadius: 63,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  slideSubtitle: {
    marginTop: 12,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  dotsRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 9,
    borderRadius: 5,
  },
  bottomControls: {
    marginTop: 22,
    paddingHorizontal: 20,
  },
});
