import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemedBackButton() {
  const navigation = useNavigation();
  const { isDark, theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={[styles.button, { backgroundColor: isDark ? 'rgba(15,23,42,0.75)' : '#FFFFFF', borderColor: theme.border }]}
      activeOpacity={0.8}
    >
      <ChevronLeft size={20} color={theme.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#312E81',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
