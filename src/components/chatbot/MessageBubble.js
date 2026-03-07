import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const MessageBubble = ({ message, isUser }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View style={[styles.bubble, isUser ? styles.user : styles.ai, { backgroundColor: isUser ? themeColors.primary : themeColors.card }]}>
      <Text style={[styles.text, { color: isUser ? '#FFFFFF' : themeColors.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 20,
    marginVertical: 5,
  },
  user: {
    alignSelf: 'flex-end',
  },
  ai: {
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 16,
  },
});

export default MessageBubble;