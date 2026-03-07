import React from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

const LoginScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <TextInput placeholder="Email" style={[styles.input, { color: themeColors.text }]} />
      <TextInput placeholder="Password" secureTextEntry style={[styles.input, { color: themeColors.text }]} />
      <Button title="Login" color={themeColors.primary} />
      <Button title="Register" onPress={() => navigation.navigate('Register')} color={themeColors.accent} />
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

export default LoginScreen;