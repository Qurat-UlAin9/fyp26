import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MoodEmoji from '../../components/emotion/MoodEmoji';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const moods = ['Happy', 'Sad', 'Anxious'];

const EmotionRegulationScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Emotion Regulation</Text>
      <View style={styles.moods}>
        {moods.map(m => <MoodEmoji key={m} mood={m} onPress={() => console.log(m)} />)}
      </View>
      <Text style={[styles.tip, { color: themeColors.text }]}>Tips: Breathe deeply.</Text>
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
  moods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tip: {
    fontSize: 16,
    marginTop: 20,
  },
});

export default EmotionRegulationScreen;