import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function OptionCard({ label, selected, onPress, disabled }) {
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
      style={[styles.touchable, animatedStyle]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <LinearGradient
        colors={selected ? ['#7C3AED', '#6366F1', '#38BDF8'] : ['#FFFFFF', '#EEF2FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, selected && styles.cardSelected, disabled && styles.cardDisabled]}
      >
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    shadowColor: '#312E81',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#312E81',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
