import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../../components/common/ThemeProvider';
import ADHDCard from '../../components/common/ADHDCard';
import ADHDButton from '../../components/common/ADHDButton';
import { ShieldCheck, Zap, Brain, Heart } from 'lucide-react-native';

const slides = [
  { title: 'Welcome to FocusMind', subtitle: 'Your ADHD companion', icon: 'ShieldCheck', color: '#4F46E5' },
  { title: 'Stay Focused', subtitle: 'Tools for your brain', icon: 'Zap', color: '#10B981' },
  { title: 'Track Emotions', subtitle: 'Understand patterns', icon: 'Brain', color: '#F59E0B' },
  { title: 'Build Habits', subtitle: 'Small wins matter', icon: 'Heart', color: '#EC4899' }
];

const OnboardingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);

 const nextSlide = () =>
  currentSlide < 3
    ? setCurrentSlide(currentSlide + 1)
    : navigation.replace('AuthStack', {
        screen: 'LanguageThemeScreen'
      });
  const skip = () =>    
  navigation.replace('AuthStack', {
    screen: 'LanguageThemeScreen'
  });

  const slide = slides[currentSlide];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
          {slides.map((_, i) => (
            <View key={i} style={{ 
              width: i === currentSlide ? 36 : 10, 
              height: 10, 
              borderRadius: 5, 
              backgroundColor: i === currentSlide ? colors.primary : colors.border 
            }} />
          ))}
        </View>

        <ADHDCard title={slide.title} subtitle={slide.subtitle}>
          <View style={{ 
            width: 140, height: 140, borderRadius: 70, 
            backgroundColor: slide.color + '15', 
            justifyContent: 'center', alignItems: 'center', 
            alignSelf: 'center', marginVertical: 32 
          }}>
            <ShieldCheck size={64} color={slide.color} />
          </View>
          <ADHDButton title={currentSlide === 3 ? 'Get Started' : 'Next'} onPress={nextSlide} />
          <ADHDButton title="Skip" variant="outline" onPress={skip} />
        </ADHDCard>
      </ScrollView>
    </View>
  );
};

export default OnboardingScreen;
