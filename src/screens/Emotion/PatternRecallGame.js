import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Dimensions } from 'react-native';
import { ChevronLeft, Stars } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const BASE_POSITIONS = [
  { x: 0.2, y: 0.18 }, { x: 0.75, y: 0.14 }, { x: 0.48, y: 0.4 }, { x: 0.86, y: 0.36 },
  { x: 0.18, y: 0.66 }, { x: 0.74, y: 0.78 }, { x: 0.55, y: 0.62 }, { x: 0.34, y: 0.82 },
  { x: 0.1, y: 0.42 }, { x: 0.9, y: 0.56 }, { x: 0.32, y: 0.1 }, { x: 0.62, y: 0.9 },
];

export default function PatternRecallGame({ navigation }) {
  const [pattern, setPattern] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [isWatching, setIsWatching] = useState(true);
  const [level, setLevel] = useState(1);
  const [activeStar, setActiveStar] = useState(null);
  const [starPositions, setStarPositions] = useState(BASE_POSITIONS.slice(0, 7));

  const startLevel = (lvl) => {
    setIsWatching(true);
    setUserInput([]);
    const starCount = Math.min(BASE_POSITIONS.length, 7 + Math.floor((lvl - 1) / 2));
    const levelPositions = BASE_POSITIONS.slice(0, starCount).map((item, id) => ({ ...item, id }));
    setStarPositions(levelPositions);
    // Generate a pattern of 'lvl + 2' stars
    const newPattern = Array.from({ length: Math.min(lvl + 2, starCount + 2) }, () =>
      Math.floor(Math.random() * starCount)
    );
    setPattern(newPattern);
    playPattern(newPattern);
  };

  const playPattern = async (ptrn) => {
    for (let i = 0; i < ptrn.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setActiveStar(ptrn[i]);
      await new Promise(resolve => setTimeout(resolve, 400));
      setActiveStar(null);
    }
    setIsWatching(false);
  };

  useEffect(() => { startLevel(level); }, []);

  const handleStarPress = (id) => {
    if (isWatching) return;

    const nextInput = [...userInput, id];
    const currentStep = userInput.length;

    if (id === pattern[currentStep]) {
      setUserInput(nextInput);
      if (nextInput.length === pattern.length) {
        // Level Complete
        setTimeout(() => {
          setLevel(l => l + 1);
          startLevel(level + 1);
        }, 1000);
      }
    } else {
      // Wrong tap
      alert("Pattern Broken! Restarting Level...");
      startLevel(level);
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}><ChevronLeft color="#DDD6FE" size={28} /></Pressable>
          <View style={styles.statBox}>
            <Text style={styles.levelLabel}>CONSTELLATION</Text>
            <Text style={styles.levelValue}>Level {level}</Text>
          </View>
          <Stars color="#FDE68A" size={24} />
        </View>

        <View style={styles.gameBoard}>
          <Text style={styles.instruction}>
            {isWatching ? "Watch the Pattern..." : "Repeat the Sequence"}
          </Text>

          <View style={styles.starsContainer}>
            {userInput.slice(1).map((currentId, idx) => {
              const prev = starPositions[userInput[idx]];
              const curr = starPositions[currentId];
              if (!prev || !curr) return null;
              const x1 = prev.x * (width - 40);
              const y1 = prev.y * 400;
              const x2 = curr.x * (width - 40);
              const y2 = curr.y * 400;
              const length = Math.hypot(x2 - x1, y2 - y1);
              const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
              return (
                <View
                  key={`line-${idx}`}
                  style={[
                    styles.pathLine,
                    { width: length, left: x1, top: y1, transform: [{ rotate: `${angle}deg` }] },
                  ]}
                />
              );
            })}
            {starPositions.map((pos) => {
              const isActive = activeStar === pos.id || userInput.includes(pos.id);
              return (
                <Pressable
                  key={pos.id}
                  onPress={() => handleStarPress(pos.id)}
                  style={[styles.starWrapper, { top: `${pos.y * 100}%`, left: `${pos.x * 100}%` }]}
                >
                  <Animated.View 
                    style={[
                      styles.star, 
                      isActive && styles.starActive,
                      activeStar === pos.id && styles.starPulse
                    ]} 
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.progressText}>
            {userInput.length} / {pattern.length} Stars Connected
          </Text>
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
  gameBoard: { flex: 1, marginTop: 40 },
  instruction: { color: '#DDD6FE', fontSize: 18, textAlign: 'center', fontWeight: '600', marginBottom: 20 },
  starsContainer: { flex: 1, position: 'relative' },
  pathLine: { position: 'absolute', height: 2, backgroundColor: '#C4B5FD' },
  starWrapper: { position: 'absolute', width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
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
  footer: { marginBottom: 50, alignItems: 'center' },
  progressText: { color: '#A78BFA', fontSize: 16, fontWeight: '600' }
});
