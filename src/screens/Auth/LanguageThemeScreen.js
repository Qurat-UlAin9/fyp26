import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const LanguageThemeScreen = () => {
  const { theme, toggleTheme } = useTheme();
  const themeColors = colors[theme];
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Select Language & Theme</Text>
      {/* Language dropdown */}
      <View style={styles.option}>
        <Text style={[styles.label, { color: themeColors.text }]}>Dark Theme</Text>
        <Switch value={isDark} onValueChange={() => toggleTheme(isDark ? 'light' : 'dark')} />
      </View>
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
  },
  label: {
    fontSize: 18,
  },
});

export default LanguageThemeScreen;