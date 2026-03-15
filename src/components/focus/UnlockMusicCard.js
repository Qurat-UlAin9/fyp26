import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock, Music2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function UnlockMusicCard({ completedSessions }) {
  const { theme, isDark } = useTheme();
  const sessionsLeft = Math.max(0, 3 - completedSessions);

  return (
    <View style={[styles.card, { backgroundColor: isDark ? 'rgba(15,23,42,0.7)' : '#FFFFFF', borderColor: theme.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(56,189,248,0.18)' : '#E0F2FE' }]}>
        <Music2 size={20} color="#38BDF8" />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Unlock Music</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Complete {sessionsLeft} more sessions to unlock your playlist</Text>
      </View>

      <Lock size={18} color={theme.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
