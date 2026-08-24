import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function StatsSection({ completedSessions, totalMinutes }) {
  const { isDark } = useTheme();

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const labelColor = isDark ? '#334155' : '#94A3B8';
  const valueColor = isDark ? '#E0F2FE' : '#0F172A';

  return (
    <View style={styles.row}>
      <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.statValue, { color: valueColor }]}>{completedSessions}</Text>
        <Text style={[styles.statLabel, { color: labelColor }]}>Sessions</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: cardBorder }]} />

      <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.statValue, { color: valueColor }]}>{totalMinutes}</Text>
        <Text style={[styles.statLabel, { color: labelColor }]}>Minutes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 18,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 40,
  },
});