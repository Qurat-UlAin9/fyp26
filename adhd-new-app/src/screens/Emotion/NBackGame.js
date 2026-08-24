import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { ChevronLeft, BrainCircuit } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const GRID_SIZE = 3; // 3x3 Grid
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

export default function NBackGame({ navigation }) {
  const [sequence, setSequence] = useState([]);
  const [score, setScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [flashingIndex, setFlashingIndex] = useState(null);
  const [nValue, setNValue] = useState(1); // Default to 1-Back
  
  const progressWidth = useSharedValue(0);
  const flashScale = useSharedValue(1);

  // Game Loop
  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        const nextIndex = Math.floor(Math.random() * TOTAL_CELLS);
        
        // Trigger Animation
        setFlashingIndex(nextIndex);
        flashScale.value = withSequence(withTiming(1.2, { duration: 100 }), withSpring(1));
        
        // Update Sequence
        setSequence(prev => [...prev, nextIndex]);
        
        // Timer Reset Animation
        progressWidth.value = 0;
        progressWidth.value = withTiming(width - 80, { duration: 2000 });

        // Clear flash after 500ms
        setTimeout(() => setFlashingIndex(null), 500);
      }, 2500); // New flash every 2.5 seconds
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleMatch = () => {
    if (sequence.length <= nValue) return;

    const current = sequence[sequence.length - 1];
    const target = sequence[sequence.length - (1 + nValue)];

    if (current === target) {
      setScore(s => s + 100);
    } else {
      setScore(s => Math.max(0, s - 50));
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));
  const flashAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }],
  }));

  return (
    <LinearGradient colors={['#0F172A', '#2E1065']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}><ChevronLeft color="#DDD6FE" size={28} /></Pressable>
          <View style={styles.scoreBoard}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
          <View style={styles.nBadge}><Text style={styles.nText}>{nValue}-Back</Text></View>
        </View>

        {/* Game Grid */}
        <View style={styles.gridContainer}>
          <View style={styles.grid}>
            {[...Array(TOTAL_CELLS)].map((_, i) => (
              <View key={i} style={styles.cell}>
                {flashingIndex === i && (
                  <Animated.View style={[styles.flash, { backgroundColor: '#A78BFA' }, flashAnimatedStyle]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Timer Bar */}
        <View style={styles.timerTrack}>
          <Animated.View style={[styles.timerFill, progressStyle]} />
        </View>

        {/* Controls */}
        <View style={styles.footer}>
          {!isActive ? (
            <Pressable style={styles.startBtn} onPress={() => setIsActive(true)}>
              <Text style={styles.startBtnText}>START CHALLENGE</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.matchBtn} onPress={handleMatch}>
              <Text style={styles.matchBtnText}>POSITION MATCH</Text>
            </Pressable>
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
  gridContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { width: width - 80, height: width - 80, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: (width - 110) / 3, height: (width - 110) / 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)' },
  flash: { flex: 1, borderRadius: 14, shadowColor: '#A78BFA', shadowOpacity: 0.8, shadowRadius: 15 },
  timerTrack: { height: 6, width: width - 80, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, alignSelf: 'center', marginBottom: 40, overflow: 'hidden' },
  timerFill: { height: '100%', backgroundColor: '#A78BFA' },
  footer: { marginBottom: 40 },
  startBtn: { backgroundColor: '#7C3AED', height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.5, shadowRadius: 15 },
  startBtnText: { color: 'white', fontSize: 18, fontWeight: '800' },
  matchBtn: { backgroundColor: 'rgba(167, 139, 250, 0.1)', height: 80, borderRadius: 20, borderWidth: 2, borderColor: '#A78BFA', justifyContent: 'center', alignItems: 'center' },
  matchBtnText: { color: '#A78BFA', fontSize: 22, fontWeight: '800' }
});
