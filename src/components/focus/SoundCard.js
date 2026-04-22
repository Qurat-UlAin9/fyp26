import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../common/GlassCard';

export default function SoundCard({ title, selected, onSelect }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onSelect}>
      <GlassCard style={[styles.card, selected && { borderColor: theme.accentGradient[0], borderWidth: 2 }]}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '500' },
});