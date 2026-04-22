import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function StatsSection({ completedSessions, totalMinutes }) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.stat, { color: theme.text }]}>{completedSessions} Completed</Text>
      <Text style={[styles.separator, { color: theme.textSecondary }]}>|</Text>
      <Text style={[styles.stat, { color: theme.text }]}>{totalMinutes} Minutes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  stat: {
    fontSize: 18,
    fontWeight: '700',
  },
  separator: {
    fontSize: 18,
    fontWeight: '700',
  },
});
