import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GlassCard from '../common/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const SoundCard = ({ sound, onSelect }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <TouchableOpacity onPress={() => onSelect(sound)}>
      <GlassCard style={styles.card}>
        <Text style={[styles.text, { color: themeColors.text }]}>{sound.name}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default SoundCard;