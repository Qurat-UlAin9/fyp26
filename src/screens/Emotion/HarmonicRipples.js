import React, { useEffect } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Music4 } from 'lucide-react-native';
import { Audio } from 'expo-av';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const NOTES = [
  { id: 'r1', color: '#FDE68A', src: require('../../../assets/sounds/Notes/Ripple1.mp3') },
  { id: 'r2', color: '#93C5FD', src: require('../../../assets/sounds/Notes/Ripple2.mp3') },
  { id: 'r3', color: '#C4B5FD', src: require('../../../assets/sounds/Notes/Ripple3.wav') },
  { id: 'r4', color: '#5EEAD4', src: require('../../../assets/sounds/Notes/Ripple4.wav') },
  { id: 'r5', color: '#FDA4AF', src: require('../../../assets/sounds/Notes/Ripple5.wav') },
  { id: 'r6', color: '#A7F3D0', src: require('../../../assets/sounds/Notes/Ripple6.wav') },
];

function RipplePad({ note, delay, onPress }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100 + delay * 80, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1100 + delay * 80, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [delay, pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.28,
    transform: [{ scale: 0.95 + pulse.value * 0.12 }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay * 90).duration(450)} style={styles.padWrap}>
      <Pressable onPress={onPress} style={styles.padPress}>
        <Animated.View style={[styles.padGlow, { borderColor: note.color, shadowColor: note.color }, haloStyle]} />
        <View style={[styles.padCore, { backgroundColor: `${note.color}30`, borderColor: note.color }]}>
          <Music4 size={20} color={note.color} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HarmonicRipples({ navigation }) {
  const soundsRef = React.useRef({});

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    return () => {
      Object.values(soundsRef.current).forEach(async (sound) => {
        await sound?.unloadAsync();
      });
    };
  }, []);

  const playNote = async (note) => {
    if (!soundsRef.current[note.id]) {
      const { sound } = await Audio.Sound.createAsync(note.src, { shouldPlay: true });
      soundsRef.current[note.id] = sound;
      return;
    }

    const snd = soundsRef.current[note.id];
    await snd.replayAsync();
  };

  return (
    <LinearGradient colors={['#0B122F', '#111827', '#0F172A']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft color="#E2E8F0" size={20} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Harmonic Ripples</Text>
          <View style={{ width: 46 }} />
        </View>

        <Text style={styles.subtitle}>Tap any ripple to layer calming tones.</Text>

        <View style={styles.padGrid}>
          {NOTES.map((note, idx) => (
            <RipplePad key={note.id} note={note} delay={idx + 1} onPress={() => playNote(note)} />
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  backText: { color: '#E2E8F0' },
  title: { color: '#F8FAFC', fontSize: 28, fontWeight: '700' },
  subtitle: { color: 'rgba(226,232,240,0.76)', marginTop: 16, marginBottom: 24 },
  padGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 20,
    alignContent: 'flex-start',
  },
  padWrap: { width: '31%', aspectRatio: 1 },
  padPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  padGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  padCore: {
    width: '78%',
    height: '78%',
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
