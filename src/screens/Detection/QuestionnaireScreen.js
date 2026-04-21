import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import CoinPill from '../../components/common/CoinPill';

const QUESTIONS = [
  'How often do you have trouble finishing tasks once the challenging parts are done?',
  'How often do you have difficulty organizing tasks and activities?',
  'How often do you forget appointments or obligations?',
  'How often do you avoid tasks that require sustained mental effort?',
  'How often do you fidget or feel restless?',
  'How often do you feel overly active or driven by a motor?',
];

const OPTIONS = [
  { label: 'Never', color: '#E6E6FA' },
  { label: 'Rarely', color: '#F0FFF0' },
  { label: 'Sometimes', color: '#F0F8FF' },
  { label: 'Often', color: '#F7E7CE' },
  { label: 'Very Often', color: '#FEE7F0' },
];

const RADIUS = 88;
const STROKE = 16;
const CIRC = 2 * Math.PI * RADIUS;

export default function QuestionnaireScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));

  const progress = useMemo(() => (currentIndex + 1) / QUESTIONS.length, [currentIndex]);
  const selectedAnswer = answers[currentIndex];

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
    }, 210);
  };

  return (
    <LinearGradient colors={['#F8FAFF', '#EEF2FF', '#F0FDFA']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.topBar}>
          <Pressable style={styles.back} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={18} color="#312E81" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <CoinPill coins={182} />
        </Animated.View>

        <View style={styles.ringWrap}>
          <Svg width={200} height={200}>
            <Defs>
              <SvgGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#3B82F6" />
                <Stop offset="100%" stopColor="#6EE7B7" />
              </SvgGradient>
            </Defs>
            <Circle cx="100" cy="100" r={RADIUS} stroke="rgba(148,163,184,0.2)" strokeWidth={STROKE} fill="none" />
            <Circle
              cx="100"
              cy="100"
              r={RADIUS}
              stroke="url(#progressGrad)"
              strokeLinecap="round"
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRC} ${CIRC}`}
              strokeDashoffset={CIRC - CIRC * progress}
              rotation="-90"
              origin="100,100"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
            <Text style={styles.progressLabel}>Progress</Text>
          </View>
        </View>

        <Animated.View key={currentIndex} entering={FadeInRight.duration(260)} exiting={FadeOutLeft.duration(220)} style={styles.questionCard}>
          <Text style={styles.questionCount}>Question {currentIndex + 1} / {QUESTIONS.length}</Text>
          <Text style={styles.questionText}>{QUESTIONS[currentIndex]}</Text>
        </Animated.View>

        <View style={styles.optionsList}>
          {OPTIONS.map((option) => {
            const selected = selectedAnswer === option.label;
            return (
              <Pressable
                key={option.label}
                style={[
                  styles.option,
                  { backgroundColor: option.color, borderColor: selected ? option.color : 'transparent', borderWidth: selected ? 3 : 1 },
                  selected && styles.optionGlow,
                ]}
                onPress={() => handleSelect(option.label)}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: 18 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  backText: { color: '#312E81', fontWeight: '700' },
  ringWrap: { width: 200, height: 200, alignSelf: 'center', marginTop: 14, marginBottom: 18 },
  ringCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 40, fontWeight: '800', color: '#0F172A' },
  progressLabel: { fontSize: 14, color: '#64748B', marginTop: 2 },
  questionCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    shadowColor: '#1E293B',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  questionCount: { color: '#6366F1', fontWeight: '700', marginBottom: 8 },
  questionText: { color: '#0F172A', fontSize: 17, lineHeight: 24, fontWeight: '700' },
  optionsList: { marginTop: 14, gap: 10 },
  option: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, borderColor: 'rgba(148,163,184,0.15)' },
  optionGlow: {
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  optionText: { fontSize: 16, fontWeight: '700', color: '#334155' },
});
