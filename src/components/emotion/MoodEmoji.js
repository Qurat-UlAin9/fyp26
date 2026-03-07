import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Smile } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const MoodEmoji = ({ mood, onPress }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Smile color={themeColors.primary} size={40} />
      <Text style={[styles.text, { color: themeColors.text }]}>{mood}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: 10,
  },
  text: {
    fontSize: 16,
  },
});

export default MoodEmoji;