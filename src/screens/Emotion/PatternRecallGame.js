import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChevronLeft, Stars } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { coinsForGameScore } from '../../utils/gameRewards';

const BASE_POSITIONS = [
  { x: 0.2, y: 0.18 }, { x: 0.75, y: 0.14 }, { x: 0.48, y: 0.4 }, { x: 0.86, y: 0.36 },
  { x: 0.18, y: 0.66 }, { x: 0.74, y: 0.78 }, { x: 0.55, y: 0.62 }, { x: 0.34, y: 0.82 },
  { x: 0.1, y: 0.42 }, { x: 0.9, y: 0.56 }, { x: 0.32, y: 0.1 }, { x: 0.62, y: 0.9 },
];
const POINTS_PER_STAR = 10;

export default function PatternRecallGame({ navigation }) {
  const { earnCoins } = useTheme();
  const [pattern, setPattern] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [isWatching, setIsWatching] = useState(true);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [activeStar, setActiveStar] = useState(null);
  const [starPositions, setStarPositions] = useState(BASE_POSITIONS.slice(0, 7));
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const playbackTimer = useRef(null);
  const nextLevelTimer = useRef(null);
  const sessionRef = useRef(0);
  const patternRef = useRef([]);
  const inputRef = useRef([]);
  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const isWatchingRef = useRef(true);
  const gameOverRef = useRef(false);

  const clearTimers = () => {
    if (playbackTimer.current) clearTimeout(playbackTimer.current);
    playbackTimer.current = null;
    if (nextLevelTimer.current) clearTimeout(nextLevelTimer.current);
    nextLevelTimer.current = null;
  };

  const playPattern = (items, session) => {
    const flashAt = (index) => {
      if (session !== sessionRef.current) return;
      if (index >= items.length) {
        setActiveStar(null);
        isWatchingRef.current = false;
        setIsWatching(false);
        return;
      }

      setActiveStar(items[index]);
      playbackTimer.current = setTimeout(() => {
        playbackTimer.current = null;
        if (session !== sessionRef.current) return;
        setActiveStar(null);
        playbackTimer.current = setTimeout(() => {
          playbackTimer.current = null;
          flashAt(index + 1);
        }, 300);
      }, 450);
    };

    playbackTimer.current = setTimeout(() => {
      playbackTimer.current = null;
      flashAt(0);
    }, 500);
  };

  const startLevel = (nextLevel, resetScore = false) => {
    clearTimers();
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    levelRef.current = nextLevel;
    inputRef.current = [];
    isWatchingRef.current = true;
    gameOverRef.current = false;

    const starCount = Math.min(BASE_POSITIONS.length, 7 + Math.floor((nextLevel - 1) / 2));
    const positions = BASE_POSITIONS.slice(0, starCount).map((item, id) => ({ ...item, id }));
    const nextPattern = Array.from(
      { length: Math.min(nextLevel + 2, starCount) },
      () => Math.floor(Math.random() * starCount)
    );
    patternRef.current = nextPattern;

    setLevel(nextLevel);
    setStarPositions(positions);
    setPattern(nextPattern);
    setUserInput([]);
    setIsWatching(true);
    setGameOver(false);
    setCoinsEarned(0);
    setActiveStar(null);
    if (resetScore) {
      scoreRef.current = 0;
      setScore(0);
    }
    playPattern(nextPattern, session);
  };

  useEffect(() => {
    startLevel(1, true);
    return () => {
      sessionRef.current += 1;
      clearTimers();
    };
  }, []);

  const finishGame = () => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    isWatchingRef.current = true;
    setIsWatching(true);
    setGameOver(true);
    setActiveStar(null);
    clearTimers();

    const reward = coinsForGameScore(scoreRef.current);
    setCoinsEarned(reward);
    if (reward > 0) earnCoins(reward);
    Toast.show({
      type: 'success',
      text1: 'Pattern Recall finished',
      text2: `${scoreRef.current} points · ${reward} coins earned`,
      visibilityTime: 3000,
    });
  };

  const handleStarPress = (id) => {
    if (isWatchingRef.current || gameOverRef.current) return;

    const currentStep = inputRef.current.length;
    if (id !== patternRef.current[currentStep]) {
      finishGame();
      return;
    }

    const nextInput = [...inputRef.current, id];
    inputRef.current = nextInput;
    setUserInput(nextInput);
    const nextScore = scoreRef.current + POINTS_PER_STAR;
    scoreRef.current = nextScore;
    setScore(nextScore);

    if (nextInput.length === patternRef.current.length) {
      isWatchingRef.current = true;
      setIsWatching(true);
      const nextLevel = levelRef.current + 1;
      nextLevelTimer.current = setTimeout(() => startLevel(nextLevel), 700);
    }
  };

  const handleRestart = () => startLevel(1, true);

  const handleBack = () => {
    clearTimers();
    navigation.goBack();
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={handleBack}>
            <ChevronLeft color="#DDD6FE" size={28} />
          </Pressable>
          <View style={styles.statBox}>
            <Text style={styles.levelLabel}>CONSTELLATION</Text>
            <Text style={styles.levelValue}>Level {level}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Stars color="#FDE68A" size={20} />
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
        </View>

        <View style={styles.gameBoard}>
          <Text style={styles.instruction}>
            {gameOver ? 'Pattern ended' : isWatching ? 'Watch the Pattern...' : 'Repeat the Sequence'}
          </Text>

          <View
            style={styles.starsContainer}
            onLayout={({ nativeEvent }) => {
              const { width: boardWidth, height } = nativeEvent.layout;
              setBoardSize({ width: boardWidth, height });
            }}
          >
            {userInput.slice(1).map((currentId, idx) => {
              const previous = starPositions[userInput[idx]];
              const current = starPositions[currentId];
              if (!previous || !current || !boardSize.width || !boardSize.height) return null;

              const x1 = previous.x * boardSize.width;
              const y1 = previous.y * boardSize.height;
              const x2 = current.x * boardSize.width;
              const y2 = current.y * boardSize.height;
              const length = Math.hypot(x2 - x1, y2 - y1);
              const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

              return (
                <View
                  pointerEvents="none"
                  key={`line-${idx}`}
                  style={[
                    styles.pathLine,
                    {
                      width: length,
                      left: (x1 + x2 - length) / 2,
                      top: (y1 + y2) / 2,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
            {starPositions.map((position) => {
              const isActive = activeStar === position.id || userInput.includes(position.id);
              return (
                <Pressable
                  key={position.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Star ${position.id + 1}`}
                  disabled={isWatching || gameOver}
                  onPress={() => handleStarPress(position.id)}
                  style={[
                    styles.starWrapper,
                    { top: `${position.y * 100}%`, left: `${position.x * 100}%` },
                  ]}
                >
                  <View
                    style={[
                      styles.star,
                      isActive && styles.starActive,
                      activeStar === position.id && styles.starPulse,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          {gameOver ? (
            <>
              <Text style={styles.progressText}>
                Final score: {score} points · {coinsEarned} coins earned
              </Text>
              <Pressable accessibilityRole="button" style={styles.restartButton} onPress={handleRestart}>
                <Text style={styles.restartText}>PLAY AGAIN</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.progressText}>
              {userInput.length} / {pattern.length} Stars Connected
            </Text>
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
  statBox: { alignItems: 'center' },
  levelLabel: { color: '#A78BFA', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  levelValue: { color: '#F5F3FF', fontSize: 20, fontWeight: '800' },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  scoreValue: { color: '#FDE68A', fontSize: 18, fontWeight: '800' },
  gameBoard: { flex: 1, marginTop: 32 },
  instruction: { color: '#DDD6FE', fontSize: 18, textAlign: 'center', fontWeight: '600', marginBottom: 20 },
  starsContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  pathLine: { position: 'absolute', height: 2, backgroundColor: '#C4B5FD' },
  starWrapper: {
    position: 'absolute',
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(167, 139, 250, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.6)',
  },
  starActive: {
    backgroundColor: '#FDE68A',
    borderColor: '#FFF',
    shadowColor: '#FDE68A',
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  starPulse: {
    transform: [{ scale: 1.5 }],
    backgroundColor: '#DDD6FE',
  },
  footer: { minHeight: 76, marginBottom: 24, alignItems: 'center', justifyContent: 'center', gap: 10 },
  progressText: { color: '#A78BFA', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  restartButton: { backgroundColor: '#7C3AED', borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 },
  restartText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
