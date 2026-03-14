import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Award, Settings, LogOut } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.avatarWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
          <User color={theme.accentGradient[0]} size={56} />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>Ain</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>62</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Focus mins/day</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>5</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Habit streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>78%</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mood summary</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Rewards')}>
          <Award color="#FFFFFF" size={18} />
          <Text style={styles.actionText}>Rewards</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Settings')}>
          <Settings color="#FFFFFF" size={18} />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => navigation.replace('Login')}>
          <LogOut color="#FFFFFF" size={18} />
          <Text style={styles.actionText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, alignItems: 'center', paddingTop: 36 },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  name: { fontSize: 26, fontWeight: '700', marginBottom: 20 },
  statsGrid: { width: '100%', gap: 10, marginBottom: 26 },
  statCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { marginTop: 4, fontSize: 13 },
  actionBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 10,
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
