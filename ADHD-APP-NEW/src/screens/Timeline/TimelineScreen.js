import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';

const nodes = ['Mood', 'Tasks', 'Habits', 'Sleep', 'Focus'];
const positions = [
  { x: 150, y: 100 },
  { x: 80, y: 200 },
  { x: 220, y: 200 },
  { x: 40, y: 300 },
  { x: 260, y: 300 },
];

export default function TimelineScreen() {
  const { theme } = useTheme();
  const [selected, setSelected] = useState(null);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <View style={styles.canvas}>
        {positions.map((pos, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.node, { left: pos.x, top: pos.y, backgroundColor: theme.accentGradient[i % 3] }]}
            onPress={() => setSelected(nodes[i])}
          >
            <View style={[styles.nodeInner, selected === nodes[i] && styles.nodeGlow]} />
            <Text style={styles.nodeLabel}>{nodes[i]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected && (
        <GlassCard style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>{selected}</Text>
          <Text style={[styles.summaryDesc, { color: theme.textSecondary }]}>
            Summary for {selected} will appear here.
          </Text>
        </GlassCard>
      )}
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: { flex: 1, position: 'relative' },
  node: { position: 'absolute', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#8B5CF6', shadowOpacity: 0.8, shadowRadius: 10, elevation: 10 },
  nodeInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF' },
  nodeGlow: { shadowColor: '#8B5CF6', shadowOpacity: 1, shadowRadius: 20, elevation: 20 },
  nodeLabel: { position: 'absolute', bottom: -20, color: '#FFF', fontSize: 12 },
  summaryCard: { position: 'absolute', bottom: 20, left: 20, right: 20, padding: 16 },
  summaryTitle: { fontSize: 18, fontWeight: '600' },
  summaryDesc: { fontSize: 14, marginTop: 4 },
});