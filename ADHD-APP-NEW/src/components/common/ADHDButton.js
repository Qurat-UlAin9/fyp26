import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

export default function ADHDButton({ title, onPress, style, textStyle, gradient = true }) {
  const { theme } = useTheme();

  if (gradient) {
    return (
      <TouchableOpacity onPress={onPress} style={[styles.wrapper, style]}>
        <LinearGradient
          colors={theme.accentGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={[styles.solid, { backgroundColor: theme.card }, style]}>
      <Text style={[styles.text, { color: theme.text }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 30, overflow: 'hidden' },
  gradient: { paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  solid: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30, alignItems: 'center' },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});