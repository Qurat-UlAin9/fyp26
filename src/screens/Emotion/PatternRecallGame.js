import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  withSpring,
  FadeIn
} from 'react-native-reanimated';
import { ChevronLeft, Stars } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Define fixed positions for the "stars" so they don't jump around
const STAR_POSITIONS = [
  { id: 0, top: '15%', left: '20%' },
  { id: 1, top: '10%', right: '25%' },
  { id: 2, top: '40%', left: '45%' },
  { id: 3, top: '35%', right: '10%' },
  { id: 4, top: '65%', left: '15%' },
  { id: 5, top: '75%', right: '20%' },
  { id: 6, top: '60%', right: '45%' },
];

export default function PatternRecallGame({ navigation }) {
  const [pattern, setPattern] = useState([]);
  const [userInput, setUserInput] = useState([]);
  const [isWatching, setIsWatching] = useState(true);
  const [level, setLevel] = useState(1);
  const [activeStar, setActiveStar] = useState(null);

  const startLevel = (lvl) => {
    setIsWatching(true);
    setUserInput([]);
    // Generate a pattern of 'lvl + 2' stars
    const newPattern = Array.from({ length: lvl + 2 }, () => 
      Math.floor(Math.random() * STAR_POSITIONS.length)
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
            {STAR_POSITIONS.map((pos) => {
              const isActive = activeStar === pos.id || userInput.includes(pos.id);
              return (
                <Pressable
                  key={pos.id}
                  onPress={() => handleStarPress(pos.id)}
                  style={[styles.starWrapper, { top: pos.top, left: pos.left, right: pos.right }]}
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
