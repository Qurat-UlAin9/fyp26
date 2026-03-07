import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const StreakBar = ({ current, best }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <LinearGradient colors={colors.gradients} style={styles.bar}>
      <Text style={[styles.text, { color: themeColors.text }]}>Current Streak: {current} Days 🔥</Text>
      <Text style={[styles.text, { color: themeColors.text }]}>Best Streak: {best} Days</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 20,
    margin: 10,
  },
  text: {
    fontSize: 14,
  },
});

export default StreakBar;