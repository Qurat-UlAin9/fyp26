import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function QuestionCard({
  questionNumber,
  totalQuestions = 18,
  questionText,
  kicker = 'SELF-CHECK',
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.kicker,
          { color: theme.accentGradient?.[0] || '#8B5CF6' },
        ]}
      >
        {kicker}
      </Text>
      <Text style={[styles.counter, { color: theme.textSecondary }]}>
        Question {questionNumber} of {totalQuestions}
      </Text>
      <Text style={[styles.question, { color: theme.text }]}>
        {questionText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  kicker: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  counter: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  question: {
    fontSize: 27,
    lineHeight: 36,
    fontWeight: '700',
  },
});