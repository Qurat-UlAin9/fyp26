import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

const OnboardingScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Welcome to ADHD App</Text>
      <Button title="Get Started" onPress={() => navigation.navigate('LanguageTheme')} color={themeColors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default OnboardingScreen;