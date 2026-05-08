import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  Easing,
  FadeInDown,
  FadeOutUp
} from 'react-native-reanimated';
import { Eye, Hand, Ear, Flower2, ChefHat } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronLeft } from 'lucide-react-native';

const SENSE_STEPS = [
  { key: 'see', count: 5, label: 'things you can See', icon: Eye, color: '#A5F3FC' },
  { key: 'touch', count: 4, label: 'things you can Touch', icon: Hand, color: '#FBCFE8' },
  { key: 'hear', count: 3, label: 'things you can Hear', icon: Ear, color: '#C4B5FD' },
  { key: 'smell', count: 2, label: 'things you can Smell', icon: Flower2, color: '#BAE6FD' },
  { key: 'taste', count: 1, label: 'thing you can Taste', icon: ChefHat, color: '#FDE68A' },
];

export default function GroundingSession({ navigation, onClose }) {
  const { theme } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const step = SENSE_STEPS[stepIndex];
  const Icon = step.icon;
  
  const pulse = useSharedValue(1);

  // Soft ambient pulse behind the icon
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.3 - (pulse.value - 1),
  }));

  const handleNext = () => {
    if (stepIndex < SENSE_STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      if (onClose) onClose(); else navigation.goBack();
    }
  };

  return (
    <LinearGradient colors={theme.background} style={styles.sessionBody}>
      <TouchableOpacity style={[styles.backBtn, { borderColor: theme.border }]} onPress={() => navigation.goBack()}>
        <ChevronLeft color={theme.text} size={20} />
      </TouchableOpacity>
      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <Animated.View 
          style={[styles.progressBarFill, { width: `${((stepIndex + 1) / SENSE_STEPS.length) * 100}%` }]} 
        />
      </View>

      <Text style={[styles.sessionTitle, { color: theme.text }]}>Grounding</Text>
      
      {/* Animated Content Wrapper */}
      <Animated.View 
        key={step.key} 
        entering={FadeInDown.duration(600)} 
        exiting={FadeOutUp.duration(400)}
        style={styles.content}
      >
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.halo, { backgroundColor: step.color }, haloStyle]} />
          <View style={[styles.iconCircle, { borderColor: step.color }]}>
            <Icon size={70} color={step.color} strokeWidth={1.5} />
          </View>
        </View>

        <Text style={[styles.countText, { color: theme.text }]}>{step.count}</Text>
        <Text style={[styles.instructionText, { color: theme.text }]}>{step.label}</Text>
        <Text style={[styles.subInstruction, { color: theme.textSecondary }]}>Take your time to notice each one...</Text>
      </Animated.View>

      <Pressable style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={handleNext}>
        <Text style={[styles.actionText, { color: theme.text }]}>
          {stepIndex === SENSE_STEPS.length - 1 ? 'Finish' : 'Next'}
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sessionBody: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 12, width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  progressBarBg: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: 30 },
  progressBarFill: { height: '100%', backgroundColor: '#BAE6FD', borderRadius: 2 },
  sessionTitle: { fontSize: 24, fontWeight: '600', opacity: 0.9 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  iconContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  halo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  countText: { fontSize: 64, fontWeight: '800' },
  instructionText: { fontSize: 22, fontWeight: '500', textAlign: 'center' },
  subInstruction: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  actionButton: {
    marginBottom: 40,
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 18, fontWeight: '700' },
});
