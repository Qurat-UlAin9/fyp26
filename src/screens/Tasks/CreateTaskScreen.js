import React from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const CreateTaskScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <TextInput placeholder="Task Title" style={[styles.input, { color: themeColors.text }]} />
      <TextInput placeholder="Time" style={[styles.input, { color: themeColors.text }]} />
      <Button title="Create" color={themeColors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
});

export default CreateTaskScreen;