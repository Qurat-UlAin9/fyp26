import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const moods = ['😌', '🙂', '😟', '😣', '😴'];

export default function EmotionRegulationScreen() {
  const { theme, isDark } = useTheme();
  const [selectedMood, setSelectedMood] = useState('😌');
  const breathe = useSharedValue(1);

  React.useEffect(() => {
    breathe.value = withRepeat(withTiming(1.25, { duration: 2200 }), -1, true);
  }, [breathe]);

  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
    opacity: 0.35 + breathe.value * 0.3,
  }));

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Emotion Regulation</Text>

        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Breathing Animation</Text>
          <View style={styles.breathingWrap}>
            <Animated.View style={[styles.breathingCircle, { backgroundColor: theme.accentGradient[0] }, breathingStyle]} />
            <Text style={[styles.breathingLabel, { color: theme.textSecondary }]}>Inhale 4 • Hold 4 • Exhale 6</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>5-4-3-2-1 Grounding</Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>5 see • 4 touch • 3 hear • 2 smell • 1 taste</Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Mood Logging</Text>
          <View style={styles.moodRow}>
            {moods.map((m) => (
              <TouchableOpacity key={m} onPress={() => setSelectedMood(m)} style={[styles.moodBtn, selectedMood === m && styles.moodSelected]}>
                <Text style={styles.moodText}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>Current mood: {selectedMood}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Calming Techniques</Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>• Cold water splash (30 sec)</Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>• Shoulder release stretch</Text>
          <Text style={[styles.desc, { color: theme.textSecondary }]}>• 2-minute body scan</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 28 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 14 },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  desc: { fontSize: 13, marginBottom: 4 },
  breathingWrap: { alignItems: 'center', paddingVertical: 8 },
  breathingCircle: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  breathingLabel: { fontSize: 13 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  moodBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.15)',
  },
  moodSelected: { borderWidth: 2, borderColor: '#8B5CF6' },
  moodText: { fontSize: 22 },
});
