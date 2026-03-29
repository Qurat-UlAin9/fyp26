import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function QuestionCard({ questionNumber, questionText }) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>ADHD Self-Check</Text>
      <Text style={styles.counter}>Question {questionNumber} of 18</Text>
      <Text style={styles.question}>{questionText}</Text>
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
    color: '#3730A3',
    marginBottom: 8,
  },
  counter: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 14,
  },
  question: {
    fontSize: 27,
    lineHeight: 36,
    fontWeight: '700',
    color: '#0F172A',
  },
});
