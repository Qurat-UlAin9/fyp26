import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function OptionCard({ label, selected, onPress, disabled, style }) {
  const { isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 18, stiffness: 250 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 250 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.touchable, style, animatedStyle]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <LinearGradient
        colors={
          selected
            ? isDark
              ? ['#5B21B6', '#1D4ED8', '#1E3A8A']
              : ['#7C3AED', '#6366F1', '#38BDF8']
            : isDark
              ? ['#1E1B4B', '#1E3A8A']
              : ['#FFFFFF', '#EEF2FF']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isDark && styles.cardDark, selected && styles.cardSelected, disabled && styles.cardDisabled]}
      >
        <Text style={[styles.label, isDark && styles.labelDark, selected && styles.labelSelected]}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 12,
    minWidth: '30%',
  },
  card: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 68,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDark: {
    borderColor: 'rgba(147, 197, 253, 0.35)',
    shadowColor: '#1D4ED8',
  },
  cardSelected: {
    borderColor: 'rgba(56, 189, 248, 0.8)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  cardDisabled: {
    opacity: 0.75,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#312E81',
    textAlign: 'center',
  },
  labelDark: {
    color: '#E2E8F0',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
