import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { CheckCircle, Circle } from 'lucide-react-native';
import GlassCard from '../common/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';

export default function TaskCard({ task, onToggle }) {
  const { theme } = useTheme();
  const height = useSharedValue(80); // collapsed height

  const animatedStyle = useAnimatedStyle(() => ({
    height: withTiming(task.expanded ? 300 : 80, { duration: 300 }),
  }));

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <GlassCard style={styles.card}>
        <TouchableOpacity onPress={onToggle} style={styles.collapsed}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>{task.title}</Text>
            <Text style={[styles.deadline, { color: theme.textSecondary }]}>{task.deadline}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: theme.accentGradient[0] + '20' }]}>
              <Text style={[styles.badgeText, { color: theme.accentGradient[0] }]}>AI Generated Plan</Text>
            </View>
            <Text style={[styles.preview, { color: theme.textSecondary }]}>{task.subtasks.length} steps ready</Text>
          </View>
        </TouchableOpacity>

        {task.expanded && (
          <View style={styles.expanded}>
            {task.subtasks.map((sub, idx) => (
              <View key={idx} style={styles.subtaskRow}>
                <TouchableOpacity>
                  <Circle color={theme.textSecondary} size={18} />
                </TouchableOpacity>
                <Text style={[styles.subtaskText, { color: theme.text }]}>{sub}</Text>
              </View>
            ))}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '40%', backgroundColor: theme.accentGradient[0] }]} />
            </View>
            <Text style={[styles.remaining, { color: theme.textSecondary }]}>2/5 steps completed</Text>
          </View>
        )}
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { marginBottom: 16, overflow: 'hidden' },
  card: { padding: 16 },
  collapsed: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  deadline: { fontSize: 14 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  preview: { fontSize: 12 },
  expanded: { marginTop: 16 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  subtaskText: { marginLeft: 8, fontSize: 14 },
  progressBar: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginVertical: 12, overflow: 'hidden' },
  progressFill: { height: '100%' },
  remaining: { fontSize: 12, textAlign: 'right' },
});