import React from 'react';
import { View, Text, Switch, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const SettingsScreen = () => {
  const { theme, toggleTheme } = useTheme();
  const themeColors = colors[theme];
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
      <View style={styles.option}>
        <Text style={[styles.label, { color: themeColors.text }]}>Dark Theme</Text>
        <Switch value={isDark} onValueChange={() => toggleTheme(isDark ? 'light' : 'dark')} />
      </View>
      <View style={styles.option}>
        <Text style={[styles.label, { color: themeColors.text }]}>Language</Text>
        {/* Dropdown placeholder */}
      </View>
      <Button title="Logout" color={themeColors.primary} />
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
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  label: {
    fontSize: 18,
  },
});

export default SettingsScreen;