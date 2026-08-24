import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Award, Settings, LogOut, Target, CheckCircle2, Brain, Flame } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';

function StatCard({ icon, label, value, theme, isDark }) {
  return (
    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: theme.border }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { theme, isDark, stats, coins, titles } = useTheme();
  const { profile, tasks, habits, focusSessions } = useAppData();

  const completedTasks = stats.tasksCompleted;
  const onTimeRate = completedTasks ? Math.round((completedTasks / (completedTasks + tasks.length)) * 100) : 0;
  const achieved = titles.filter((t) => t.unlocked).length;

  const insight = useMemo(() => {
    if (stats.focusMinutes > 120) return 'Great momentum: your focus routine is becoming consistent.';
    if (habits.length > 0) return 'Nice progress: habit consistency will improve your executive function over time.';
    return 'Start by adding 1 task and 1 habit today to build a steady rhythm.';
  }, [stats.focusMinutes, habits.length]);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.avatarWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
          <User color={theme.accentGradient[0]} size={52} />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{profile.name}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>Mood: {profile.mood} • ADHD Screen: {profile.adhdScreening}</Text>

        <View style={styles.statsGrid}>
          <StatCard icon="✅" label="Active tasks" value={tasks.length} theme={theme} isDark={isDark} />
          <StatCard icon="🏁" label="Completed tasks" value={completedTasks} theme={theme} isDark={isDark} />
          <StatCard icon="⏱" label="On-time rate" value={`${onTimeRate}%`} theme={theme} isDark={isDark} />
          <StatCard icon="🔥" label="Habit streak" value={stats.habitStreak} theme={theme} isDark={isDark} />
          <StatCard icon="🎯" label="Focus sessions" value={focusSessions.length} theme={theme} isDark={isDark} />
          <StatCard icon="🪙" label="Total coins" value={coins} theme={theme} isDark={isDark} />
          <StatCard icon="🏆" label="Achievements" value={achieved} theme={theme} isDark={isDark} />
        </View>

        <View style={[styles.insightCard, { backgroundColor: isDark ? 'rgba(15,23,42,0.62)' : 'rgba(255,255,255,0.9)', borderColor: theme.border }]}>
          <Brain color={theme.accentGradient[0]} size={18} />
          <Text style={[styles.insightTitle, { color: theme.text }]}>Personalized insight</Text>
          <Text style={[styles.insightText, { color: theme.textSecondary }]}>{insight}</Text>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Rewards')}><Award color="#FFFFFF" size={18} /><Text style={styles.actionText}>Rewards</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Settings')}><Settings color="#FFFFFF" size={18} /><Text style={styles.actionText}>Settings</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => navigation.replace('Login')}><LogOut color="#FFFFFF" size={18} /><Text style={styles.actionText}>Logout</Text></TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, alignItems: 'center', paddingTop: 22, paddingBottom: 120 },
  avatarWrap: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 28, fontWeight: '800' },
  meta: { marginTop: 4, marginBottom: 16, fontSize: 13, fontWeight: '600' },
  statsGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  statCard: { width: '48%', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1 },
  statIcon: { fontSize: 16 },
  statValue: { fontSize: 22, fontWeight: '800', marginTop: 5 },
  statLabel: { marginTop: 2, fontSize: 12, fontWeight: '600' },
  insightCard: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14 },
  insightTitle: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  insightText: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  actionBtn: { width: '100%', borderRadius: 14, paddingVertical: 13, marginBottom: 10, backgroundColor: '#7C3AED', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
