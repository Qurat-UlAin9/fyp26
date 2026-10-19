import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check, ChevronLeft, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { coinsForGameScore } from '../../utils/gameRewards';

const GRID_SIZE = 3;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const N_VALUE = 1;
const TOTAL_ROUNDS = 15;
const ROUND_DURATION_MS = 2500;
const POINTS_PER_ANSWER = 10;

function createPosition(sequence, round) {
  if (round > N_VALUE && Math.random() < 0.35) {
    return sequence[sequence.length - N_VALUE];
  }

  const previousPosition = round > N_VALUE ? sequence[sequence.length - N_VALUE] : null;
  const choices = Array.from({ length: TOTAL_CELLS }, (_, index) => index)
    .filter((index) => index !== previousPosition);
  return choices[Math.floor(Math.random() * choices.length)];
}

export default function NBackGame({ navigation }) {
  const { earnCoins } = useTheme();
  const { width } = useWindowDimensions();
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [incorrectAnswers, setIncorrectAnswers] = useState(0);
  const [missedAnswers, setMissedAnswers] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [flashingIndex, setFlashingIndex] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(true);
  const [feedback, setFeedback] = useState('Press start when you are ready.');
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const sequenceRef = useRef([]);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const missedRef = useRef(0);
  const targetMatchRef = useRef(false);
  const answeredRef = useRef(true);
  const finishedRef = useRef(false);
  const flashTimerRef = useRef(null);
  const progressWidth = useSharedValue(0);
  const flashScale = useSharedValue(1);
  const trackWidth = Math.min(width - 40, 560);
  const gridWidth = Math.min(width - 56, 420);
  const cellSize = (gridWidth - 20) / GRID_SIZE;

  const showStimulus = () => {
    const nextRound = roundRef.current + 1;
    const position = createPosition(sequenceRef.current, nextRound);
    const isMatch = nextRound > N_VALUE
      && position === sequenceRef.current[sequenceRef.current.length - N_VALUE];

    sequenceRef.current = [...sequenceRef.current, position];
    roundRef.current = nextRound;
    targetMatchRef.current = isMatch;
    answeredRef.current = false;

    setFlashingIndex(position);
    setHasAnswered(false);
    setFeedback(`Round ${nextRound}: does this match the position ${N_VALUE} round ago?`);
    flashScale.value = withSequence(withTiming(1.12, { duration: 120 }), withSpring(1));
    progressWidth.value = 0;
    progressWidth.value = withTiming(trackWidth, { duration: ROUND_DURATION_MS });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashingIndex(null), 650);
  };

  const finishGame = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsActive(false);
    setIsFinished(true);
    setFlashingIndex(null);
    progressWidth.value = 0;

    const reward = coinsForGameScore(scoreRef.current);
    setCoinsEarned(reward);
    if (reward > 0) earnCoins(reward);
    setFeedback(
      `Challenge complete · ${correctRef.current} correct · ${incorrectRef.current} incorrect · ${missedRef.current} unanswered`
    );
    Toast.show({
      type: 'success',
      text1: 'N-Back challenge complete',
      text2: `${scoreRef.current} points · ${reward} coins earned`,
      visibilityTime: 3000,
    });
  };

  useEffect(() => {
    if (!isActive) return undefined;

    const interval = setInterval(() => {
      if (roundRef.current >= TOTAL_ROUNDS) {
        if (!answeredRef.current) {
          missedRef.current += 1;
          setMissedAnswers(missedRef.current);
        }
        finishGame();
        return;
      }

      if (!answeredRef.current) {
        missedRef.current += 1;
        setMissedAnswers(missedRef.current);
      }
      showStimulus();
    }, ROUND_DURATION_MS);

    return () => clearInterval(interval);
  }, [isActive, trackWidth]);

  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  const handleStart = () => {
    sequenceRef.current = [];
    roundRef.current = 0;
    scoreRef.current = 0;
    correctRef.current = 0;
    incorrectRef.current = 0;
    missedRef.current = 0;
    answeredRef.current = true;
    finishedRef.current = false;
    setScore(0);
    setCorrectAnswers(0);
    setIncorrectAnswers(0);
    setMissedAnswers(0);
    setHasAnswered(true);
    setCoinsEarned(0);
    setIsFinished(false);
    setFeedback('Get ready…');
    setIsActive(true);
    showStimulus();
  };

  const handleAnswer = (answerIsMatch) => {
    if (!isActive || answeredRef.current) return;
    answeredRef.current = true;
    setHasAnswered(true);

    if (answerIsMatch === targetMatchRef.current) {
      const nextScore = scoreRef.current + POINTS_PER_ANSWER;
      scoreRef.current = nextScore;
      correctRef.current += 1;
      setScore(nextScore);
      setCorrectAnswers(correctRef.current);
      setFeedback('Correct! Get ready for the next position.');
    } else {
      incorrectRef.current += 1;
      setIncorrectAnswers(incorrectRef.current);
      setFeedback('Not quite — watch the next position carefully.');
    }
  };

  const handleBack = () => {
    setIsActive(false);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    navigation.goBack();
  };

  const progressStyle = useAnimatedStyle(() => ({ width: progressWidth.value }));
  const flashAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }],
  }));

  return (
    <LinearGradient colors={['#0F172A', '#2E1065']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={handleBack}>
            <ChevronLeft color="#DDD6FE" size={28} />
          </Pressable>
          <View style={styles.scoreBoard}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
          <View style={styles.nBadge}><Text style={styles.nText}>{N_VALUE}-Back</Text></View>
        </View>

        <Text style={styles.instructions}>
          Remember each square. Choose MATCH if it is the same as the square shown one turn ago.
        </Text>

        <View style={styles.gridContainer}>
          <View style={[styles.grid, { width: gridWidth, height: gridWidth }]}>
            {Array.from({ length: TOTAL_CELLS }, (_, index) => (
              <View key={index} style={[styles.cell, { width: cellSize, height: cellSize }]}>
                {flashingIndex === index && (
                  <Animated.View style={[styles.flash, flashAnimatedStyle]} />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.roundInfo, { width: trackWidth }]}>
          <Text style={styles.roundText}>
            {isFinished ? 'Challenge complete' : `Round ${roundRef.current} / ${TOTAL_ROUNDS}`}
          </Text>
          <View style={styles.timerTrack}>
            <Animated.View style={[styles.timerFill, progressStyle]} />
          </View>
          <Text style={styles.feedback} accessibilityLiveRegion="polite">{feedback}</Text>
        </View>

        <View style={styles.footer}>
          {!isActive ? (
            <View style={styles.resultArea}>
              {isFinished && (
                <Text style={styles.resultText}>
                  {correctAnswers} correct · {incorrectAnswers} incorrect · {missedAnswers} unanswered · {coinsEarned} coins earned
                </Text>
              )}
              <Pressable accessibilityRole="button" style={styles.startBtn} onPress={handleStart}>
                <Text style={styles.startBtnText}>{isFinished ? 'PLAY AGAIN' : 'START CHALLENGE'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.answerRow}>
              <Pressable
                accessibilityRole="button"
                disabled={hasAnswered}
                style={[styles.answerBtn, styles.noMatchBtn, hasAnswered && styles.disabledBtn]}
                onPress={() => handleAnswer(false)}
              >
                <X color="#F5F3FF" size={22} />
                <Text style={styles.answerBtnText}>NO MATCH</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={hasAnswered}
                style={[styles.answerBtn, styles.matchBtn, hasAnswered && styles.disabledBtn]}
                onPress={() => handleAnswer(true)}
              >
                <Check color="#F5F3FF" size={22} />
                <Text style={styles.answerBtnText}>MATCH</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  scoreBoard: { alignItems: 'center' },
  scoreLabel: { color: '#A78BFA', fontSize: 12, fontWeight: '700' },
  scoreValue: { color: '#F5F3FF', fontSize: 24, fontWeight: '800' },
  nBadge: { backgroundColor: 'rgba(167, 139, 250, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#A78BFA' },
  nText: { color: '#DDD6FE', fontWeight: '700' },
  instructions: { color: '#DDD6FE', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 20, minHeight: 40 },
  gridContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignContent: 'center' },
  cell: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  flash: { flex: 1, borderRadius: 14, backgroundColor: '#A78BFA', shadowColor: '#A78BFA', shadowOpacity: 0.8, shadowRadius: 15 },
  roundInfo: { alignSelf: 'center', alignItems: 'center', gap: 10, marginBottom: 22 },
  roundText: { color: '#DDD6FE', fontSize: 14, fontWeight: '700' },
  timerTrack: { height: 6, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: '#A78BFA' },
  feedback: { color: '#A78BFA', minHeight: 38, fontSize: 13, textAlign: 'center' },
  footer: { marginBottom: 28 },
  resultArea: { alignItems: 'center', gap: 12 },
  resultText: { color: '#DDD6FE', fontSize: 14, textAlign: 'center' },
  startBtn: { backgroundColor: '#7C3AED', minHeight: 56, width: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  startBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
  answerRow: { flexDirection: 'row', gap: 12 },
  answerBtn: { flex: 1, minHeight: 68, borderRadius: 18, borderWidth: 2, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  noMatchBtn: { backgroundColor: 'rgba(167, 139, 250, 0.1)', borderColor: '#A78BFA' },
  matchBtn: { backgroundColor: 'rgba(124, 58, 237, 0.45)', borderColor: '#A78BFA' },
  answerBtnText: { color: '#DDD6FE', fontSize: 15, fontWeight: '800' },
  disabledBtn: { opacity: 0.55 },
});