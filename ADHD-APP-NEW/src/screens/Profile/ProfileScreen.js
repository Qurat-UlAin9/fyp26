import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Edit, LogOut } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';
import ADHDButton from '../../components/common/ADHDButton';

export default function ProfileScreen({ navigation }) {
  const { theme } = useTheme();
  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.card }]}>
            <User color={theme.text} size={60} />
          </View>
          <TouchableOpacity style={styles.editIcon} onPress={() => navigation.navigate('EditProfile')}>
            <Edit color={theme.text} size={20} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.name, { color: theme.text }]}>Alex Johnson</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>alex@example.com</Text>

        <GlassCard style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: theme.text }]}>42</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Focus Sessions</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: theme.text }]}>7</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Habit Streak</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statValue, { color: theme.text }]}>89%</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Task Completion</Text>
          </View>
        </GlassCard>

        <ADHDButton title="Edit Profile" onPress={() => navigation.navigate('EditProfile')} style={styles.button} />
        <ADHDButton title="Logout" onPress={() => navigation.replace('Login')} gradient={false} style={styles.button} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', borderRadius: 20, padding: 6 },
  name: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 16, marginBottom: 24 },
  statsCard: { width: '100%', flexDirection: 'row', justifyContent: 'space-around', padding: 20, marginBottom: 32 },
  statRow: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  button: { width: '100%', marginBottom: 12 },
});