import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';

export default function EmotionRegulationScreen() {
  const { theme } = useTheme();
  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: theme.text }]}>Emotion Regulation</Text>
        <Text style={[styles.sectionHeader, { color: theme.text }]}>Instant Mood Lifting</Text>
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Deep Breathing</Text>
          <View style={styles.breathingCircle} />
        </GlassCard>
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>5-4-3-2-1 Grounding</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>Acknowledge 5 things you see...</Text>
        </GlassCard>
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Affirmation</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>"I am calm and capable."</Text>
        </GlassCard>

        <Text style={[styles.sectionHeader, { color: theme.text }]}>Long-Term Regulation</Text>
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Memory Exercise</Text>
        </GlassCard>
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Cognitive Flexibility</Text>
        </GlassCard>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  sectionHeader: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 12 },
  card: { marginBottom: 12, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 14 },
  breathingCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#8B5CF6', marginTop: 8 },
});