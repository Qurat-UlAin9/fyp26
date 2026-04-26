import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { ChevronLeft, Play, Pause, RefreshCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

export default function MeditationSession({ navigation }) {
  const { theme } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [seconds, setSeconds] = useState(300); // 5 minutes
  const scale = useSharedValue(1);

  // Pulsing animation for the Lotus
  useEffect(() => {
    if (isPlaying) {
      scale.value = withRepeat(withTiming(1.2, { duration: 4000, easing: Easing.inOut(Easing.sin) }), -1, true);
      const timer = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000);
      return () => {
        clearInterval(timer);
        scale.value = withTiming(1);
      };
    }
  }, [isPlaying]);

  const animatedLotus = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color={theme.text} size={28} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Guided Meditation</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Meditation Visual Area */}
        <View style={styles.visualContainer}>
          <View style={styles.outerCircle}>
             <Animated.View style={[styles.mainLotus, animatedLotus]}>
                <Text style={{fontSize: 60}}>🪷</Text>
             </Animated.View>
          </View>
          <Text style={[styles.timerText, { color: theme.accentGradient[0] }]}>{formatTime(seconds)}</Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            {isPlaying ? "Focus on your breath" : "Ready to begin?"}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable onPress={() => setSeconds(300)} style={[styles.secondaryBtn, { borderColor: theme.border }]}>
            <RefreshCcw color={theme.accentGradient[0]} size={24} />
          </Pressable>
          
          <Pressable onPress={() => setIsPlaying(!isPlaying)} style={[styles.playBtn, { backgroundColor: theme.accentGradient[0] }]}>
            {isPlaying ? <Pause color="#0F172A" size={32} fill="#0F172A" /> : <Play color="#0F172A" size={32} fill="#0F172A" />}
          </Pressable>

          <View style={{width: 24}} /> 
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  headerTitle: { color: '#FDE68A', fontSize: 18, fontWeight: '600' },
  visualContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  outerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  mainLotus: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.4)',
  },
  timerText: { color: '#FDE68A', fontSize: 54, fontWeight: '700', marginTop: 40 },
  instructionText: { color: '#94A3B8', fontSize: 18, marginTop: 10 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 50 },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#FDE68A',
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  secondaryBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(253, 230, 138, 0.3)', justifyContent: 'center', alignItems: 'center' }
});
