import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../../components/detection/QuestionCard';
import OptionCard from '../../components/detection/OptionCard';

const QUESTIONS = [
  'How often do you have trouble finishing tasks once the challenging parts are done?',
  'How often do you have difficulty organizing tasks and activities?',
  'How often do you forget appointments or obligations?',
  'How often do you avoid tasks that require sustained mental effort?',
  'How often do you fidget or feel restless?',
  'How often do you feel overly active or driven by a motor?',
  'How often do you make careless mistakes in daily activities?',
  'How often do you have difficulty sustaining attention?',
  'How often do you seem not to listen when spoken to directly?',
  'How often do you lose things necessary for tasks?',
  'How often are you easily distracted?',
  'How often do you feel forgetful in daily routines?',
  'How often do you interrupt others while they are speaking?',
  'How often do you find it hard to wait your turn?',
  'How often do you talk excessively?',
  'How often do you feel impatient?',
  'How often do you struggle to relax?',
  'How often do you feel overwhelmed by responsibilities?',
];

const OPTIONS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'];

export default function QuestionnaireScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));

  const progress = useMemo(() => (currentIndex + 1) / QUESTIONS.length, [currentIndex]);
  const selectedAnswer = answers[currentIndex];

  const goBack = () => {
    if (currentIndex === 0) {
      navigation?.goBack?.();
      return;
    }

    setCurrentIndex((prev) => prev - 1);
  };

  const handleSelect = (option) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = option;
      return next;
    });

    setTimeout(() => {
      if (currentIndex < QUESTIONS.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 240);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) {
      return;
    }

    const answeredCount = answers.filter(Boolean).length;
    Alert.alert('Assessment complete', `You answered ${answeredCount} out of ${QUESTIONS.length} questions.`);
  };

  return (
    <LinearGradient colors={['#F8FAFF', '#EEF2FF', '#E0E7FF']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={goBack} accessibilityRole="button">
            <Ionicons name="chevron-back" size={20} color="#312E81" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.progressText}>Question {currentIndex + 1} of 18</Text>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            layout={Layout.duration(280)}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        <Animated.View
          key={currentIndex}
          entering={FadeInRight.duration(260)}
          exiting={FadeOutLeft.duration(220)}
          style={styles.contentWrap}
        >
          <QuestionCard questionNumber={currentIndex + 1} questionText={QUESTIONS[currentIndex]} />

          <View style={styles.optionList}>
            {OPTIONS.map((option) => (
              <OptionCard
                key={option}
                label={option}
                selected={selectedAnswer === option}
                onPress={() => handleSelect(option)}
              />
            ))}
          </View>
        </Animated.View>

        {currentIndex === QUESTIONS.length - 1 ? (
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedAnswer}
            style={[styles.finishButton, !selectedAnswer && styles.finishButtonDisabled]}
          >
            <LinearGradient
              colors={selectedAnswer ? ['#7C3AED', '#6366F1'] : ['#A5B4FC', '#A5B4FC']}
              style={styles.finishGradient}
            >
              <Text style={styles.finishText}>Finish screening</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#312E81',
  },
  progressText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    overflow: 'hidden',
    marginBottom: 22,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#6366F1',
  },
  contentWrap: {
    flex: 1,
  },
  optionList: {
    marginTop: 8,
  },
  finishButton: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  finishButtonDisabled: {
    opacity: 0.65,
  },
  finishGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
