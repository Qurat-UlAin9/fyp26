import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const TaskDetailsScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Task Details</Text>
      <Text style={[styles.detail, { color: themeColors.text }]}>Description here</Text>
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
  detail: {
    fontSize: 18,
  },
});

export default TaskDetailsScreen;