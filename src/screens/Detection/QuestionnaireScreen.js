import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInRight,
  FadeOutLeft,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import QuestionCard from '../../components/detection/QuestionCard';
import CircularProgress from '../../components/detection/CircularProgress';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import { submitAssessment } from '../../services/api';
import { showAlert, showConfirm } from '../../utils/alert';

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

const OPTION_GRADIENTS = {
  Never: ['#60A5FA', '#3B82F6'],
  Rarely: ['#34D399', '#10B981'],
  Sometimes: ['#FBBF24', '#F59E0B'],
  Often: ['#FB923C', '#F97316'],
  'Very Often': ['#F87171', '#EF4444'],
};

const SCORE_MAP = {
  Never: 0,
  Rarely: 1,
  Sometimes: 2,
  Often: 3,
  'Very Often': 4,
};

export default function QuestionnaireScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { refreshData } = useAppData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const accent = theme.accentGradient?.[0] || '#8B5CF6';

  const answeredCount = useMemo(
    () => answers.filter((a) => a != null).length,
    [answers]
  );
  const selectedAnswer = answers[currentIndex];
  const isLast = currentIndex === QUESTIONS.length - 1;

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
    }, 280);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) {
      showAlert('Almost there', 'Please select an answer for this question.');
      return;
    }
    if (answers.some((a) => a === null)) {
      const missing = answers.filter((a) => a === null).length;
      showAlert(
        'Incomplete',
        `${missing} question${missing === 1 ? '' : 's'} left. Please answer all before finishing.`
      );
      return;
    }

    const numericAnswers = answers.map((answer) => SCORE_MAP[answer] ?? 0);

    try {
      setSubmitting(true);
      setSubmitError(null);
      const result = await submitAssessment(numericAnswers);
      if (!result) {
        throw new Error('Backend did not return a result.');
      }

      // Refresh app-wide state so Home reflects the new assessment
      if (typeof refreshData === 'function') {
        refreshData().catch(() => undefined);
      }

      navigation.navigate('AssessmentResult', {
        score: result.score,
        maxScore: result.max_score,
        percentage: result.percentage,
        answeredCount: answers.filter(Boolean).length,
        totalQuestions: QUESTIONS.length,
        predictedLabel: result.predicted_label,
        adhdProbability: result.adhd_probability,
        topFactors: result.top_factors || [],
      });
    } catch (error) {
      console.warn('ADHD submit failed:', error);
      const msg = error?.message || 'Could not submit. Please try again.';
      setSubmitError(msg);
      showAlert('Submission error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    const ok = await showConfirm(
      'Skip assessment?',
      'Your answers will not be saved. You can restart anytime.',
      'Skip',
      'Keep answering'
    );
    if (!ok) return;
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            style={[
              styles.backButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={goBack}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
          </Pressable>

          <Text style={[styles.headerLabel, { color: accent }]}>
            ADHD SELF-CHECK
          </Text>

          <Pressable
            onPress={handleSkip}
            style={[
              styles.skipButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.skipText, { color: theme.textSecondary }]}>
              Skip
            </Text>
          </Pressable>
        </View>

        {/* Circular progress */}
        <View style={styles.circleWrap}>
          <CircularProgress
            answered={answeredCount}
            total={QUESTIONS.length}
            size={92}
            thickness={7}
            isDark={isDark}
            accent={accent}
            label="ANSWERED"
          />
        </View>

        {/* Question + options */}
        <Animated.View
          key={currentIndex}
          entering={FadeInRight.duration(260)}
          exiting={FadeOutLeft.duration(220)}
          style={styles.contentWrap}
        >
          <QuestionCard
            questionNumber={currentIndex + 1}
            totalQuestions={QUESTIONS.length}
            questionText={QUESTIONS[currentIndex]}
            kicker="ADHD SELF-CHECK"
          />

          <View style={styles.optionList}>
            {OPTIONS.map((option) => {
              const selected = selectedAnswer === option;
              const gradient = OPTION_GRADIENTS[option] || ['#8B5CF6', '#7C3AED'];
              return (
                <Pressable
                  key={option}
                  onPress={() => handleSelect(option)}
                  style={[
                    styles.optionCardWrap,
                    selected && {
                      shadowColor: gradient[1],
                      shadowOpacity: 0.5,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 8,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.optionGrad,
                      !selected && styles.optionGradUnselected,
                      selected && styles.optionGradSelected,
                    ]}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                    {selected && (
                      <View style={styles.checkBubble}>
                        <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Inline error */}
        {submitError ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: '#EF444422', borderColor: '#EF4444' },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={[styles.errorText, { color: '#EF4444' }]}>
              {submitError}
            </Text>
          </View>
        ) : null}

        {/* Finish */}
        {isLast ? (
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedAnswer || submitting}
            style={[
              styles.finishButton,
              (!selectedAnswer || submitting) && styles.finishButtonDisabled,
            ]}
          >
            <LinearGradient
              colors={
                selectedAnswer && !submitting
                  ? [theme.accentGradient[0], theme.accentGradient[1]]
                  : ['#A5B4FC', '#A5B4FC']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.finishGradient}
            >
              <Text style={styles.finishText}>
                {submitting ? 'Submitting…' : 'Finish screening'}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  backText: { fontSize: 14, fontWeight: '700' },
  headerLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  skipText: { fontSize: 13, fontWeight: '700' },

  circleWrap: { alignItems: 'center', marginVertical: 14 },

  contentWrap: { flex: 1 },

  optionList: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 10,
    rowGap: 12,
  },
  optionCardWrap: {
    flexBasis: '31%',
    maxWidth: '31%',
    borderRadius: 16,
  },
  optionGrad: {
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  optionGradUnselected: { opacity: 0.55 },
  optionGradSelected: { opacity: 1 },
  optionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  checkBubble: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  errorText: { flex: 1, fontSize: 12.5, fontWeight: '700' },

  finishButton: { marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  finishButtonDisabled: { opacity: 0.65 },
  finishGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});