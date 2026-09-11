import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeOutLeft, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../../components/detection/QuestionCard';
import OptionCard from '../../components/detection/OptionCard';
import { useTheme } from '../../contexts/ThemeContext';
import { submitEFAssessment } from '../../services/api';
import { EF_ITEMS, EF_RESPONSE_OPTIONS } from '../../data/efQuestions';

export default function EFQuestionnaireScreen({ navigation }) {
  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(EF_ITEMS.length).fill(null));
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => (currentIndex + 1) / EF_ITEMS.length, [currentIndex]);
  const selectedAnswer = answers[currentIndex];
  const currentItem = EF_ITEMS[currentIndex];

  const goBack = () => {
    if (currentIndex === 0) {
      navigation?.goBack?.();
      return;
    }
    setCurrentIndex((prev) => prev - 1);
  };

  const handleSelect = (value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });

    setTimeout(() => {
      if (currentIndex < EF_ITEMS.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 240);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;
    if (answers.some((a) => a === null)) {
      Alert.alert('Incomplete', 'Please answer every question before finishing.');
      return;
    }

    // Backend expects a flat { EF1: 3, EF2: 5, ... } map, not an ordered array,
    // since items map to named dimensions rather than positional indices.
    const responses = {};
    EF_ITEMS.forEach((item, idx) => {
      responses[item.code] = answers[idx];
    });

    try {
      setSubmitting(true);
      const result = await submitEFAssessment(responses);
      navigation.navigate('EFAssessmentResult', {
        dimensionScores: result.dimension_scores,
      });
    } catch (error) {
      Alert.alert('Submission error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0B1028', '#1E1B4B', '#1E3A8A'] : ['#F8FAFF', '#EEF2FF', '#E0E7FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(30,58,138,0.35)' : 'rgba(255, 255, 255, 0.7)' }]}
            onPress={goBack}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={isDark ? '#E2E8F0' : '#312E81'} />
            <Text style={[styles.backText, { color: isDark ? '#E2E8F0' : '#312E81' }]}>Back</Text>
          </Pressable>

          <Text style={[styles.progressText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
            Question {currentIndex + 1} of {EF_ITEMS.length}
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(99, 102, 241, 0.16)' }]}>
          <Animated.View
            layout={Layout.duration(280)}
            style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: isDark ? '#60A5FA' : '#6366F1' }]}
          />
        </View>

        <Animated.View
          key={currentIndex}
          entering={FadeInRight.duration(260)}
          exiting={FadeOutLeft.duration(220)}
          style={styles.contentWrap}
        >
          <QuestionCard questionNumber={currentIndex + 1} questionText={currentItem.text} />

          <View style={styles.optionList}>
            {EF_RESPONSE_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                label={option.label}
                selected={selectedAnswer === option.value}
                onPress={() => handleSelect(option.value)}
                style={styles.optionCardWrap}
              />
            ))}
          </View>
        </Animated.View>

        {currentIndex === EF_ITEMS.length - 1 ? (
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedAnswer}
            style={[styles.finishButton, !selectedAnswer && styles.finishButtonDisabled]}
          >
            <LinearGradient
              colors={selectedAnswer ? (isDark ? ['#5B21B6', '#2563EB'] : ['#7C3AED', '#6366F1']) : ['#A5B4FC', '#A5B4FC']}
              style={styles.finishGradient}
            >
              <Text style={styles.finishText}>{submitting ? 'Submitting...' : 'Finish assessment'}</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
  backText: { fontSize: 14, fontWeight: '700' },
  progressText: { fontSize: 14, fontWeight: '600' },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: 22 },
  progressFill: { height: '100%', borderRadius: 999 },
  contentWrap: { flex: 1 },
  optionList: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 10 },
  optionCardWrap: { flexBasis: '31%', maxWidth: '31%' },
  finishButton: { marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  finishButtonDisabled: { opacity: 0.65 },
  finishGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  finishText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
