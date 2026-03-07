import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const questions = ['Question 1', 'Question 2']; // Placeholder

const QuestionnaireScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>ADHD Questionnaire</Text>
      {questions.map((q, i) => (
        <View key={i} style={styles.question}>
          <Text style={[styles.qText, { color: themeColors.text }]}>{q}</Text>
          {/* Add radio buttons */}
        </View>
      ))}
      <Button title="Submit" color={themeColors.primary} />
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
  question: {
    marginVertical: 10,
  },
  qText: {
    fontSize: 18,
  },
});

export default QuestionnaireScreen;