import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Lock } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';

const badges = [
  { name: 'Early Bird', unlocked: true },
  { name: 'Focus Master', unlocked: true },
  { name: 'Habit Hero', unlocked: false },
  { name: 'Task Titan', unlocked: false },
];

export default function RewardsScreen() {
  const { theme } = useTheme();
  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: theme.text }]}>Rewards</Text>
        <GlassCard style={styles.progressCard}>
          <Text style={[styles.progressText, { color: theme.text }]}>2/4 Badges Unlocked</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%', backgroundColor: theme.accentGradient[0] }]} />
          </View>
        </GlassCard>
        <View style={styles.badgeGrid}>
          {badges.map((badge, idx) => (
            <GlassCard key={idx} style={styles.badgeCard}>
              {badge.unlocked ? (
                <Award color={theme.accentGradient[0]} size={40} />
              ) : (
                <Lock color={theme.textSecondary} size={40} />
              )}
              <Text style={[styles.badgeName, { color: theme.text }]}>{badge.name}</Text>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  progressCard: { padding: 16, marginBottom: 24 },
  progressText: { fontSize: 16, marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeCard: { width: '48%', alignItems: 'center', padding: 20, marginBottom: 16 },
  badgeName: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});