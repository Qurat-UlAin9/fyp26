import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import GlassCard from '../../components/common/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const placeholderRewards = ['Reward 1', 'Reward 2'];

const RewardsScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Rewards</Text>
      <FlatList
        data={placeholderRewards}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <Text style={[styles.text, { color: themeColors.text }]}>{item}</Text>
          </GlassCard>
        )}
      />
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
    marginVertical: 5,
  },
  text: {
    fontSize: 18,
  },
});

export default RewardsScreen;