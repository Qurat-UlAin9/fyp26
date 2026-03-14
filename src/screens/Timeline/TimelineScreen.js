import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const NODE_DATA = [
  { key: 'Mood', x: 0.2, y: 0.34, score: '78%', trend: 'Up 8%', description: 'Mood is improving with better sleep consistency.' },
  { key: 'Tasks', x: 0.78, y: 0.32, score: '12/16', trend: '75% complete', description: 'Most tasks are completed before the due date.' },
  { key: 'Habits', x: 0.2, y: 0.62, score: '5 day', trend: '2 habits strong', description: 'Morning routine and hydration are stable.' },
  { key: 'Focus', x: 0.78, y: 0.62, score: '62 min', trend: 'Avg 55 min/day', description: 'Focus blocks are getting longer each week.' },
];

function Node({ item, selected, onPress, isDark, color }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.35);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));

  React.useEffect(() => {
    if (selected) {
      scale.value = withSpring(1.18, { damping: 12 });
      glow.value = withSpring(0.9);
    } else {
      scale.value = withSpring(1);
      glow.value = withSpring(0.35);
    }
  }, [selected, scale, glow]);

  return (
    <Animated.View
      style={[
        styles.nodeWrap,
        {
          left: `${item.x * 100}%`,
          top: `${item.y * 100}%`,
          marginLeft: -38,
          marginTop: -38,
          shadowColor: color,
          backgroundColor: isDark ? 'rgba(30,41,59,0.86)' : '#FFFFFF',
        },
        animatedStyle,
      ]}
    >
      <TouchableOpacity onPress={onPress} style={[styles.nodeInner, { borderColor: color }]}>
        <Text style={[styles.nodeText, { color }]}>{item.key}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TimelineScreen() {
  const { theme, isDark } = useTheme();
  const [selected, setSelected] = useState(NODE_DATA[0]);

  const stars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        top: `${(i * 31) % 70}%`,
        size: 1 + (i % 3),
      })),
    []
  );

  return (
    <LinearGradient colors={isDark ? ['#020617', '#0B1120', '#1E1B4B'] : ['#E0E7FF', '#EEF2FF', '#F8FAFC']} style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Visualization Dashboard</Text>

      <View style={styles.galaxyArea}>
        {stars.map((s) => (
          <View key={s.id} style={[styles.star, { left: s.left, top: s.top, width: s.size, height: s.size }]} />
        ))}

        <View style={[styles.centerNode, { backgroundColor: theme.accentGradient[0] }]}>
          <View style={[styles.centerCore, { backgroundColor: theme.accentGradient[1] }]} />
        </View>

        {NODE_DATA.map((item, index) => (
          <Node
            key={item.key}
            item={item}
            selected={selected.key === item.key}
            onPress={() => setSelected(item)}
            isDark={isDark}
            color={theme.accentGradient[index % 3]}
          />
        ))}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)' }]}>
        <Text style={[styles.summaryTitle, { color: theme.text }]}>{selected.key} Summary</Text>
        <Text style={[styles.summaryMetric, { color: theme.accentGradient[0] }]}>Score: {selected.score}</Text>
        <Text style={[styles.summaryTrend, { color: theme.textSecondary }]}>Weekly Trend: {selected.trend}</Text>
        <View style={styles.miniChartRow}>
          {[30, 46, 38, 60, 52].map((h, i) => (
            <View key={i} style={[styles.miniBar, { height: h, backgroundColor: theme.accentGradient[i % 3] }]} />
          ))}
        </View>
        <Text style={[styles.summaryDesc, { color: theme.textSecondary }]}>{selected.description}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  galaxyArea: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    position: 'relative',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    opacity: 0.55,
  },
  centerNode: {
    position: 'absolute',
    left: '50%',
    top: '48%',
    marginLeft: -40,
    marginTop: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  centerCore: { width: 36, height: 36, borderRadius: 18 },
  nodeWrap: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  nodeInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nodeText: { fontWeight: '700', fontSize: 13 },
  summaryCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  summaryMetric: { fontSize: 16, fontWeight: '700' },
  summaryTrend: { fontSize: 13, marginTop: 2 },
  miniChartRow: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 66 },
  miniBar: { width: 12, borderRadius: 6 },
  summaryDesc: { marginTop: 10, fontSize: 13, lineHeight: 18 },
});
