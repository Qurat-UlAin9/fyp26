import React from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const EditProfileScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [name, setName] = React.useState('Ain');

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <TextInput style={[styles.input, { color: themeColors.text }]} value={name} onChangeText={setName} />
      <Button title="Save" color={themeColors.primary} />
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
    marginBottom: 20,
  },
});

export default EditProfileScreen;