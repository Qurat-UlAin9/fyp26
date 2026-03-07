// Similar to LoginScreen.js, add more fields
import React from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const RegisterScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <TextInput placeholder="Name" style={[styles.input, { color: themeColors.text }]} />
      <TextInput placeholder="Email" style={[styles.input, { color: themeColors.text }]} />
      <TextInput placeholder="Password" secureTextEntry style={[styles.input, { color: themeColors.text }]} />
      <Button title="Register" color={themeColors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
});

export default RegisterScreen;