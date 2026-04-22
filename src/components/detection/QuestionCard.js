import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function QuestionCard({ questionNumber, questionText }) {
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.kicker, { color: isDark ? '#A5B4FC' : '#3730A3' }]}>ADHD Self-Check</Text>
      <Text style={[styles.counter, { color: isDark ? '#CBD5E1' : '#475569' }]}>Question {questionNumber} of 18</Text>
      <Text style={[styles.question, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{questionText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  kicker: {
    fontSize: 14,
    fontWeight: '700',
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
