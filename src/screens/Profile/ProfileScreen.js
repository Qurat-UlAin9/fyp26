import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Profile</Text>
      <Text style={[styles.info, { color: themeColors.text }]}>Name: Ain</Text>
      <Button title="Edit Profile" onPress={() => navigation.navigate('EditProfile')} color={themeColors.primary} />
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
  info: {
    fontSize: 18,
    marginBottom: 20,
  },
});

export default ProfileScreen;