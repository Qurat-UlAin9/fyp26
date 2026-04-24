import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { ChevronLeft, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const COLORS = [
  { name: 'PURPLE', hex: '#A78BFA' },
  { name: 'GREEN', hex: '#34D399' },
  { name: 'PINK', hex: '#F472B6' },
  { name: 'YELLOW', hex: '#FBBF24' },
];

export default function StroopGame({ navigation }) {
  const [target, setTarget] = useState({ text: '', color: '' });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const scale = useSharedValue(1);

  const generateMatch = () => {
    const textIdx = Math.floor(Math.random() * COLORS.length);
    const colorIdx = Math.floor(Math.random() * COLORS.length);
    setTarget({ text: COLORS[textIdx].name, color: COLORS[colorIdx].hex });
    scale.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1));
  };

  useEffect(() => { generateMatch(); }, []);

  const handlePress = (hex) => {
    if (hex === target.color) {
      setScore(s => s + 1);
      generateMatch();
    } else {
      if (lives > 1) {
        setLives(l => l - 1);
        generateMatch();
      } else {
        alert("Game Over! Score: " + score);
        navigation.goBack();
      }
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}><ChevronLeft color="#F5F3FF" size={28} /></Pressable>
          <View style={styles.livesRow}>
            {[...Array(3)].map((_, i) => (
              <Heart key={i} size={24} color="#F472B6" fill={i < lives ? "#F472B6" : "transparent"} />
            ))}
          </View>
          <Text style={styles.scoreText}>{score}</Text>
        </View>

        <View style={styles.gameArea}>
          <Text style={styles.instruction}>Tap the color of the word</Text>
          <Animated.Text style={[styles.mainWord, { color: target.color }, animatedStyle]}>
            {target.text}
          </Animated.Text>
        </View>

        <View style={styles.buttonGrid}>
          {COLORS.map((c) => (
            <Pressable key={c.name} style={[styles.colorBtn, { backgroundColor: c.hex }]} onPress={() => handlePress(c.hex)}>
              <Text style={styles.btnText}>{c.name}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  scoreText: { color: '#DDD6FE', fontSize: 28, fontWeight: '800' },
  livesRow: { flexDirection: 'row', gap: 6 },
  gameArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  instruction: { color: '#A78BFA', fontSize: 16, marginBottom: 20, fontWeight: '600' },
  mainWord: { fontSize: 64, fontWeight: '900', letterSpacing: 2 },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center', marginBottom: 40 },
  colorBtn: { width: width * 0.4, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  btnText: { color: '#0F172A', fontWeight: '800', fontSize: 18 }
});
