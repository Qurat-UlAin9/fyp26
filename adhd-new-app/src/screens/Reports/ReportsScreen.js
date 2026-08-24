import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import GlassCard from '../../components/common/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

const ReportsScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Visualization Dashboard</Text>
      <GlassCard style={styles.card}>
        <Text style={[styles.text, { color: themeColors.text }]}>Overall Stats: Tasks Completed 10, Streaks 5</Text>
      </GlassCard>
      <GlassCard style={styles.card}>
        <Text onPress={() => navigation.navigate('Rewards')} style={[styles.text, { color: themeColors.text }]}>Rewards Summary</Text>
      </GlassCard>
      <GlassCard style={styles.card}>
        <Text onPress={() => navigation.navigate('Badges')} style={[styles.text, { color: themeColors.text }]}>Badges</Text>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  card: {
    marginVertical: 10,
  },
  text: {
    fontSize: 18,
  },
});

export default ReportsScreen;