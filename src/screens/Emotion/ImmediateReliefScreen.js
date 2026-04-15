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
import { ArrowLeft, Ear, Eye, Hand, Droplets, ChefHat, Flower2, Wind } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import BackgroundOrb from '../../components/emotion/BackgroundOrb';

const EXERCISES = [
  { id: 'balloon', title: 'Balloon Breathing', duration: '1 Min', icon: Wind },
  { id: 'grounding', title: '5-4-3-2-1 Grounding', duration: '2 Min', icon: Eye },
  { id: 'splash', title: 'Splash Relief', duration: '30 Sec', icon: Droplets },
];

const SENSE_STEPS = [
  { key: 'see', count: 5, label: 'See', icon: Eye, color: '#A5F3FC' },
  { key: 'touch', count: 4, label: 'Touch', icon: Hand, color: '#FBCFE8' },
  { key: 'hear', count: 3, label: 'Hear', icon: Ear, color: '#C4B5FD' },
  { key: 'smell', count: 2, label: 'Smell', icon: Flower2, color: '#BAE6FD' },
  { key: 'taste', count: 1, label: 'Taste', icon: ChefHat, color: '#FDE68A' },
];

function ReliefPreview({ id }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + pulse.value * 0.15 }],
    opacity: 0.55 + pulse.value * 0.45,
  }));

  if (id === 'balloon') {
    return (
      <View style={styles.previewWrap}>
        <Animated.View style={[styles.previewBalloon, style]} />
      </View>
    );
  }

  if (id === 'grounding') {
    return (
      <View style={styles.previewWrap}>
        <Animated.View style={[styles.previewStar, style]} />
      </View>
    );
  }

  return (
    <View style={styles.previewWrap}>
      <Animated.View style={[styles.previewDrop, style]} />
    </View>
  );
}

function BalloonSession({ onClose }) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reps, setReps] = useState(3);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!running) return undefined;
    const startedAt = Date.now() - elapsedMs;

    const int = setInterval(() => {
      const next = Date.now() - startedAt;
      setElapsedMs(next);
      progress.value = ((next % 8000) / 8000);
      if (next >= reps * 8000) {
        setRunning(false);
        setTimeout(onClose, 250);
      }
    }, 80);

    return () => clearInterval(int);
  }, [elapsedMs, onClose, progress, reps, running]);

  const balloonStyle = useAnimatedStyle(() => {
    const cycle = progress.value <= 0.5 ? progress.value * 2 : (1 - progress.value) * 2;
    return {
      transform: [{ scale: 0.72 + cycle * 0.42 }],
    };
  });

  const phase = progress.value <= 0.5 ? 'Inhale' : 'Exhale';
  const completed = Math.min(Math.floor(elapsedMs / 8000), reps);

  return (
    <View style={styles.sessionBody}>
      <Text style={styles.sessionTitle}>Balloon Breathing</Text>
      <Text style={styles.sessionSubtitle}>Breathe with the balloon: 4s in, 4s out.</Text>

      <View style={styles.repRow}>
        {[3, 5, 8].map((count) => (
          <Pressable
            key={count}
            style={[styles.repChip, reps === count && styles.repChipActive]}
            onPress={() => {
              setReps(count);
              setElapsedMs(0);
              progress.value = 0;
            }}
          >
            <Text style={[styles.repText, reps === count && styles.repTextActive]}>{count} Cycles</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.balloonArea}>
        <Animated.View style={[styles.mainBalloon, balloonStyle]} />
      </View>

      <Text style={styles.phaseText}>{running ? phase : 'Ready'}</Text>
      <Text style={styles.metaText}>{completed}/{reps} completed</Text>

      <Pressable style={styles.actionButton} onPress={() => (running ? setRunning(false) : setRunning(true))}>
        <Text style={styles.actionText}>{running ? 'Pause' : 'Start'}</Text>
      </Pressable>
    </View>
  );
}

function GroundingSession({ onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = SENSE_STEPS[stepIndex];
  const Icon = step.icon;

  return (
    <View style={styles.sessionBody}>
      <Text style={styles.sessionTitle}>5-4-3-2-1 Grounding</Text>
      <Text style={styles.sessionSubtitle}>Find and name sensations around you, one step at a time.</Text>

      <View style={styles.groundingIconWrap}>
        <Icon size={88} color={step.color} strokeWidth={1.6} />
      </View>

      <Text style={styles.phaseText}>{step.count} things to {step.label}</Text>
      <Text style={styles.metaText}>Step {stepIndex + 1} of {SENSE_STEPS.length}</Text>

      <Pressable
        style={styles.actionButton}
        onPress={() => {
          if (stepIndex === SENSE_STEPS.length - 1) {
            onClose();
            return;
          }
          setStepIndex((prev) => prev + 1);
        }}
      >
        <Text style={styles.actionText}>{stepIndex === SENSE_STEPS.length - 1 ? 'Complete' : 'Next'}</Text>
      </Pressable>
    </View>
  );
}

function SplashSession({ onClose }) {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(30);
  const beat = useSharedValue(0);

  useEffect(() => {
    beat.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [beat]);

  useEffect(() => {
    if (!running) return undefined;
    const int = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(int);
          setRunning(false);
          setTimeout(onClose, 220);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(int);
  }, [onClose, running]);

  const ripple = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + beat.value * 0.5 }],
    opacity: 0.55 - beat.value * 0.3,
  }));

  return (
    <View style={styles.sessionBody}>
      <Text style={styles.sessionTitle}>Splash Relief</Text>
      <Text style={styles.sessionSubtitle}>Splash cool water on your face and stay with the pulse.</Text>

      <View style={styles.splashArea}>
        <Animated.View style={[styles.rippleRing, ripple]} />
        <Animated.View style={[styles.rippleRing, styles.rippleRingSecond, ripple]} />
        <Droplets size={100} color="#93C5FD" strokeWidth={1.5} />
      </View>

      <Text style={styles.phaseText}>{remaining}s</Text>
      <Text style={styles.metaText}>Keep breathing slowly while you reset.</Text>

      <Pressable style={styles.actionButton} onPress={() => setRunning((prev) => !prev)}>
        <Text style={styles.actionText}>{running ? 'Pause' : remaining === 30 ? 'Start' : 'Resume'}</Text>
      </Pressable>
    </View>
  );
}

function ExpandedExercise({ exercise, onClose }) {
  if (!exercise) return null;
  if (exercise.id === 'balloon') return <BalloonSession onClose={onClose} />;
  if (exercise.id === 'grounding') return <GroundingSession onClose={onClose} />;
  return <SplashSession onClose={onClose} />;
}

export default function ImmediateReliefScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const cardWidth = width * 0.85;
  const [activeExercise, setActiveExercise] = useState(null);
  const [layouts, setLayouts] = useState({});
  const transition = useSharedValue(0);

  const activeLayout = activeExercise ? layouts[activeExercise.id] : null;

  useEffect(() => {
    transition.value = withTiming(activeExercise ? 1 : 0, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [activeExercise, transition]);

  const overlayStyle = useAnimatedStyle(() => {
    const left = activeLayout ? activeLayout.x : width * 0.075;
    const top = activeLayout ? activeLayout.y : 140;
    const startWidth = activeLayout ? activeLayout.width : cardWidth;
    const startHeight = activeLayout ? activeLayout.height : 260;

    return {
      left: interpolate(transition.value, [0, 1], [left, 0]),
      top: interpolate(transition.value, [0, 1], [top, 0]),
      width: interpolate(transition.value, [0, 1], [startWidth, width]),
      height: interpolate(transition.value, [0, 1], [startHeight, height]),
      borderRadius: interpolate(transition.value, [0, 1], [24, 0]),
      opacity: activeExercise ? 1 : transition.value,
    };
  });

  const overlayBg = useAnimatedStyle(() => ({
    opacity: transition.value,
  }));

  const headerRight = useMemo(() => <Text style={styles.screenTag}>Calm Zone</Text>, []);

  return (
    <LinearGradient colors={['#050917', '#0B1130', '#150F35']} style={styles.container}>
      <BackgroundOrb size={260} color="rgba(59,130,246,0.18)" top={80} left={-80} duration={11000} />
      <BackgroundOrb size={280} color="rgba(168,85,247,0.14)" top={420} right={-120} duration={9000} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color="#E2E8F0" />
          </Pressable>
          <Text style={styles.title}>Immediate Relief</Text>
          {headerRight}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {EXERCISES.map((exercise) => {
            const Icon = exercise.icon;
            return (
              <Pressable
                key={exercise.id}
                onLayout={(evt) => {
                  const { x, y, width: layoutWidth, height: layoutHeight } = evt.nativeEvent.layout;
                  setLayouts((prev) => ({ ...prev, [exercise.id]: { x, y, width: layoutWidth, height: layoutHeight } }));
                }}
                onPress={() => setActiveExercise(exercise)}
                style={[styles.cardWrap, { width: cardWidth }]}
              >
                <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
                  <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)']} style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIcon}>
                        <Icon size={18} color="#BAE6FD" />
                      </View>
                      <View style={styles.cardTextWrap}>
                        <Text style={styles.cardTitle}>{exercise.title}</Text>
                        <Text style={styles.cardMeta}>{exercise.duration}</Text>
                      </View>
                    </View>
                    <ReliefPreview id={exercise.id} />
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

      {activeExercise && (
        <Animated.View style={[styles.overlayCard, overlayStyle]}>
          <LinearGradient colors={['#0B122F', '#0A1029', '#10183A']} style={styles.overlayCardInner}>
            <Pressable style={styles.overlayBackButton} onPress={() => setActiveExercise(null)}>
              <ArrowLeft size={17} color="#E2E8F0" />
              <Text style={styles.overlayBackText}>Back</Text>
            </Pressable>
            <ExpandedExercise exercise={activeExercise} onClose={() => setActiveExercise(null)} />
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
  title: { color: '#E2E8F0', fontSize: 24, fontWeight: '700', flex: 1 },
  screenTag: { color: '#BAE6FD', fontSize: 13, fontWeight: '600' },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    gap: 14,
  },
  cardWrap: { borderRadius: 24 },
  cardBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  cardContent: { borderRadius: 24, minHeight: 220, padding: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(186,230,253,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardTextWrap: { flex: 1 },
  cardTitle: { color: '#F8FAFC', fontSize: 21, fontWeight: '700' },
  cardMeta: { color: '#BAE6FD', marginTop: 2, fontSize: 13, fontWeight: '600' },
  previewWrap: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  previewBalloon: {
    width: 92,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFB7B2',
    shadowColor: '#FFD7D4',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  previewStar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(165,243,252,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(186,230,253,0.8)',
  },
  previewDrop: {
    width: 84,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(96,165,250,0.7)',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayCard: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
  sessionBody: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
  },
  sessionTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '700', textAlign: 'center' },
  sessionSubtitle: {
    color: 'rgba(226,232,240,0.85)',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    fontSize: 15,
  },
  repRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 10 },
  repChip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repChipActive: { borderColor: 'rgba(255,183,178,0.9)', backgroundColor: 'rgba(255,183,178,0.16)' },
  repText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  repTextActive: { color: '#FFD9D6' },
  balloonArea: { height: 260, justifyContent: 'center', alignItems: 'center' },
  mainBalloon: {
    width: 170,
    height: 210,
    borderRadius: 110,
    backgroundColor: '#FFB7B2',
    shadowColor: '#FFD7D4',
    shadowOpacity: 0.75,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  phaseText: { color: '#F8FAFC', fontSize: 32, fontWeight: '700', marginTop: 10 },
  metaText: { color: '#C7D2FE', fontSize: 15, marginTop: 8 },
  actionButton: {
    marginTop: 20,
    width: 160,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(147,197,253,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(186,230,253,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#E0F2FE', fontWeight: '700', fontSize: 15 },
  groundingIconWrap: {
    marginTop: 40,
    marginBottom: 24,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  splashArea: {
    marginTop: 36,
    marginBottom: 14,
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(147,197,253,0.56)',
  },
  rippleRingSecond: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderColor: 'rgba(147,197,253,0.28)',
  },
});
