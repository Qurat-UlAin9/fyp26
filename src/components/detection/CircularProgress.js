import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CircularProgress({
  answered = 0,
  total = 1,
  size = 92,
  thickness = 7,
  isDark = false,
  accent = '#8B5CF6',
  label = 'ANSWERED',
}) {
  const progress = total > 0 ? Math.min(1, Math.max(0, answered / total)) : 0;

  const trackColor = isDark
    ? 'rgba(148,163,184,0.18)'
    : 'rgba(139,92,246,0.18)';

  const textColor = isDark ? '#E2E8F0' : '#0F172A';
  const dimColor = isDark ? '#94A3B8' : '#64748B';

  const p1Rotation = progress <= 0.5 ? progress * 360 : 180;
  const showSecond = progress > 0.5;
  const p2Rotation = showSecond ? (progress - 0.5) * 360 : 0;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: trackColor,
          },
        ]}
      />
      {progress > 0.001 && (
        <View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: thickness,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
              borderRightColor: accent,
              transform: [{ rotate: `${p1Rotation}deg` }],
            },
          ]}
        />
      )}
      {showSecond && (
        <View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: thickness,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderRightColor: 'transparent',
              borderLeftColor: accent,
              transform: [{ rotate: `${p2Rotation}deg` }],
            },
          ]}
        />
      )}
      <View style={styles.center}>
        <View style={styles.numRow}>
          <Text style={[styles.num, { color: textColor }]}>{answered}</Text>
          <Text style={[styles.slash, { color: dimColor }]}>/</Text>
          <Text style={[styles.total, { color: dimColor }]}>{total}</Text>
        </View>
        <Text style={[styles.label, { color: dimColor }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  numRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  num: { fontSize: 24, fontWeight: '900', lineHeight: 26, letterSpacing: -0.5 },
  slash: { fontSize: 16, fontWeight: '700', lineHeight: 20, marginBottom: 2, opacity: 0.7 },
  total: { fontSize: 14, fontWeight: '700', lineHeight: 18, marginBottom: 3 },
  label: { fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
});