import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, BrainCircuit, Palette, Stars } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const GAMES = [
  { id: 'nback', title: 'N-Back', subtitle: 'Working Memory', icon: BrainCircuit },
  { id: 'stroop', title: 'Stroop', subtitle: 'Inhibition', icon: Palette },
  { id: 'pattern', title: 'Pattern Match', subtitle: 'Focus', icon: Stars },
];

function NBackGame() {
  const [activeIndex, setActiveIndex] = useState(null);
  const [history, setHistory] = useState([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const n = 2;

  useEffect(() => {
    const int = setInterval(() => {
      const next = Math.floor(Math.random() * 9);
      setActiveIndex(next);
      setHistory((prev) => [...prev, next].slice(-12));
      setRound((prev) => prev + 1);
    }, 1300);
    return () => clearInterval(int);
  }, []);

  const targetMatch = history.length > n && history[history.length - 1] === history[history.length - 1 - n];

  return (
    <View style={styles.gameBody}>
      <Text style={styles.gameLabel}>N={n} • Round {round}</Text>
      <View style={styles.grid3x3}>
        {Array.from({ length: 9 }).map((_, idx) => (
          <View
            key={`cell-${idx}`}
            style={[styles.gridCell, idx === activeIndex && styles.gridCellActive]}
          />
        ))}
      </View>
      <Pressable
        style={styles.gameButton}
        onPress={() => setScore((prev) => prev + (targetMatch ? 1 : -1))}
      >
        <Text style={styles.gameButtonText}>Match ({n}-Back)</Text>
      </Pressable>
      <Text style={styles.gameScore}>Score: {score}</Text>
    </View>
  );
}

function StroopGame() {
  const choices = useMemo(
    () => [
      { word: 'RED', color: '#60A5FA', answer: 'BLUE' },
      { word: 'GREEN', color: '#F97316', answer: 'ORANGE' },
      { word: 'YELLOW', color: '#A78BFA', answer: 'PURPLE' },
      { word: 'BLUE', color: '#34D399', answer: 'GREEN' },
    ],
    []
  );

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const trial = choices[index % choices.length];
  const options = ['BLUE', 'ORANGE', 'PURPLE', 'GREEN'];

  return (
    <View style={styles.gameBody}>
      <Text style={[styles.stroopWord, { color: trial.color }]}>{trial.word}</Text>
      <View style={styles.stroopButtons}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={styles.colorButton}
            onPress={() => {
              setScore((prev) => prev + (option === trial.answer ? 1 : -1));
              setIndex((prev) => prev + 1);
            }}
          >
            <Text style={styles.colorButtonText}>{option}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.gameScore}>Score: {score}</Text>
    </View>
  );
}

function PatternGame() {
  const [sequence, setSequence] = useState([1, 3, 4, 6, 2]);
  const [input, setInput] = useState([]);
  const [showing, setShowing] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowing(false), 2200);
    return () => clearTimeout(t);
  }, [sequence]);

  const onTap = (idx) => {
    if (showing) return;
    const next = [...input, idx];
    setInput(next);

    const isWrong = sequence[next.length - 1] !== idx;
    if (isWrong) {
      setInput([]);
      return;
    }

    if (next.length === sequence.length) {
      const nextLength = Math.min(7, sequence.length + 1);
      const generated = Array.from({ length: nextLength }, () => Math.floor(Math.random() * 7));
      setSequence(generated);
      setInput([]);
      setShowing(true);
    }
  };

  return (
    <View style={styles.gameBody}>
      <Text style={styles.gameLabel}>{showing ? 'Memorize the constellation' : 'Tap the same sequence'}</Text>
      <View style={styles.starsRow}>
        {Array.from({ length: 7 }).map((_, idx) => (
          <Pressable key={`star-${idx}`} onPress={() => onTap(idx)}>
            <View
              style={[
                styles.starNode,
                showing && sequence.includes(idx) && styles.starNodeActive,
                !showing && input.includes(idx) && styles.starNodeInput,
              ]}
            />
          </Pressable>
        ))}
      </View>
      <Text style={styles.gameScore}>Length: {sequence.length}</Text>
    </View>
  );
}

function ExpandedGame({ game }) {
  if (game.id === 'nback') return <NBackGame />;
  if (game.id === 'stroop') return <StroopGame />;
  return <PatternGame />;
}

export default function CognitivePowerScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const cardWidth = width * 0.85;
  const [layouts, setLayouts] = useState({});
  const [activeGame, setActiveGame] = useState(null);
  const progress = useSharedValue(0);

  const activeLayout = activeGame ? layouts[activeGame.id] : null;

  useEffect(() => {
    progress.value = withTiming(activeGame ? 1 : 0, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [activeGame, progress]);

  const overlayStyle = useAnimatedStyle(() => {
    const left = activeLayout ? activeLayout.x : width * 0.075;
    const top = activeLayout ? activeLayout.y : 160;
    const startWidth = activeLayout ? activeLayout.width : cardWidth;
    const startHeight = activeLayout ? activeLayout.height : 240;

    return {
      left: interpolate(progress.value, [0, 1], [left, 0]),
      top: interpolate(progress.value, [0, 1], [top, 0]),
      width: interpolate(progress.value, [0, 1], [startWidth, width]),
      height: interpolate(progress.value, [0, 1], [startHeight, height]),
      borderRadius: interpolate(progress.value, [0, 1], [24, 0]),
      opacity: activeGame ? 1 : progress.value,
    };
  });

  const overlayBg = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <LinearGradient colors={['#060918', '#0E1130', '#1A1240']} style={styles.container}>
      <BackgroundOrb size={280} color="rgba(168,85,247,0.2)" top={100} left={-90} duration={10000} />
      <BackgroundOrb size={260} color="rgba(56,189,248,0.12)" top={420} right={-90} duration={9200} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color="#E2E8F0" />
          </Pressable>
          <Text style={styles.title}>Cognitive Power</Text>
          <Text style={styles.screenTag}>Mind Gym</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {GAMES.map((game) => {
            const Icon = game.icon;
            return (
              <Pressable
                key={game.id}
                onLayout={(evt) => {
                  const { x, y, width: layoutWidth, height: layoutHeight } = evt.nativeEvent.layout;
                  setLayouts((prev) => ({ ...prev, [game.id]: { x, y, width: layoutWidth, height: layoutHeight } }));
                }}
                onPress={() => setActiveGame(game)}
                style={[styles.cardWrap, { width: cardWidth }]}
              >
                <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
                  <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)']} style={styles.cardContent}>
                    <View style={styles.cardHead}>
                      <View style={styles.cardIcon}>
                        <Icon size={18} color="#C4B5FD" />
                      </View>
                      <View>
                        <Text style={styles.cardTitle}>{game.title}</Text>
                        <Text style={styles.cardSubtitle}>{game.subtitle}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardHint}>Tap to enter full-screen training mode.</Text>
                  </LinearGradient>
                </BlurView>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <Animated.View pointerEvents="none" style={[styles.overlayBackdrop, overlayBg]}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {activeGame && (
        <Animated.View style={[styles.overlayCard, overlayStyle]}>
          <LinearGradient colors={['#120E2F', '#0D122F', '#151A3A']} style={styles.overlayCardInner}>
            <Pressable style={styles.overlayBackButton} onPress={() => setActiveGame(null)}>
              <ArrowLeft size={17} color="#E2E8F0" />
              <Text style={styles.overlayBackText}>Back</Text>
            </Pressable>
            <ExpandedGame game={activeGame} />
          </LinearGradient>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: 10 },
  headerRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: { color: '#EDE9FE', fontSize: 24, fontWeight: '700', flex: 1 },
  screenTag: { color: '#C4B5FD', fontSize: 13, fontWeight: '600' },
  scrollContent: { paddingTop: 20, paddingBottom: 30, alignItems: 'center', gap: 14 },
  cardWrap: { borderRadius: 24 },
  cardBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  cardContent: { borderRadius: 24, minHeight: 170, padding: 18, justifyContent: 'space-between' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { color: '#F8FAFC', fontSize: 22, fontWeight: '700' },
  cardSubtitle: { color: '#DDD6FE', fontSize: 14, marginTop: 2 },
  cardHint: { color: 'rgba(226,232,240,0.84)', marginTop: 18, fontSize: 14 },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject },
  overlayCard: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  overlayCardInner: { flex: 1, paddingTop: 48 },
  overlayBackButton: {
    marginLeft: 16,
    width: 76,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  overlayBackText: { color: '#E2E8F0', fontWeight: '600' },
  gameBody: { flex: 1, paddingHorizontal: 22, paddingTop: 24, alignItems: 'center' },
  gameLabel: { color: '#DDD6FE', fontSize: 16, fontWeight: '600', marginBottom: 14 },
  grid3x3: {
    width: 220,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20,
  },
  gridCell: {
    width: 62,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.45)',
    backgroundColor: 'rgba(67,56,202,0.3)',
  },
  gridCellActive: {
    backgroundColor: 'rgba(196,181,253,0.9)',
    borderColor: '#F5D0FE',
  },
  gameButton: {
    marginTop: 6,
    width: 170,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(216,180,254,0.9)',
    backgroundColor: 'rgba(196,181,253,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameButtonText: { color: '#F5F3FF', fontWeight: '700' },
  gameScore: { marginTop: 14, color: '#BFDBFE', fontSize: 16, fontWeight: '600' },
  stroopWord: { fontSize: 54, fontWeight: '800', marginBottom: 22 },
  stroopButtons: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  colorButton: {
    width: 140,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  colorButtonText: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  starsRow: {
    width: '100%',
    minHeight: 130,
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.6)',
    backgroundColor: 'rgba(99,102,241,0.3)',
  },
  starNodeActive: {
    backgroundColor: '#C4B5FD',
    borderColor: '#F5D0FE',
  },
  starNodeInput: {
    backgroundColor: '#7DD3FC',
    borderColor: '#BAE6FD',
  },
});
