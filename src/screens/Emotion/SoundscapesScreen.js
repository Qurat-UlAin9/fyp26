import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { ChevronLeft, Pause, Play } from 'lucide-react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const TRACKS = [
  {
    id: 'guzheng-cinematic',
    title: 'Guzheng Cinematic Fantasy',
    mood: 'Expansive • Dreamlike',
    source: require('../../../assets/sounds/Classical/guzheng-soundtrack-cinematic-fantasy-_-ancient-asia-film-score-7-471790.mp3'),
  },
  {
    id: 'pojeng-happy',
    title: 'Pojeng Happy Love',
    mood: 'Warm • Uplifting',
    source: require('../../../assets/sounds/Classical/pojeng-epic-happy-love-guzheng-412659.mp3'),
  },
  {
    id: 'mystical-journey',
    title: 'Mystical Guzheng Journey',
    mood: 'Deep Focus • Flow',
    source: require('../../../assets/sounds/Classical/vprodmusic_asia_bgm-mystical-guzheng-journey-143598.mp3'),
  },
  {
    id: 'ancient-romance',
    title: 'Ancient Romance Ripples',
    mood: 'Gentle • Reflective',
    source: require('../../../assets/sounds/Classical/et11lx-ripple-chinese-ancient-style-music-romantic-love-et11lx-155927 (1).mp3'),
  },
];

function Waveform({ active }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, true);
    } else {
      progress.value = withTiming(0, { duration: 220 });
    }
  }, [active, progress]);

  return (
    <View style={styles.waveWrap}>
      {[0, 1, 2, 3, 4].map((idx) => {
        const barStyle = useAnimatedStyle(() => ({
          height: 10 + Math.abs(Math.sin((progress.value + idx * 0.24) * Math.PI * 2)) * 24,
          opacity: active ? 1 : 0.4,
        }));

        return <Animated.View key={`wave-${idx}`} style={[styles.waveBar, barStyle]} />;
      })}
    </View>
  );
}

function TrackCard({ track, isActive, isPlaying, progress, onToggle, delay }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    glow.value = withTiming(isActive ? 1 : 0, { duration: 280 });
  }, [glow, isActive]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(196,181,253,${0.25 + glow.value * 0.55})`,
    shadowOpacity: 0.2 + glow.value * 0.6,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.45,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.94, 1.04]) }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(480)} style={styles.cardWrap}>
      <Animated.View style={[styles.pulseLayer, pulseStyle]} />
      <Animated.View style={[styles.cardShadowWrap, cardStyle]}>
        <Pressable
          onPressIn={() => {
            scale.value = withSpring(0.985);
          }}
          onPressOut={() => {
            scale.value = withSpring(1);
          }}
          onPress={onToggle}
        >
          <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
            <LinearGradient colors={['rgba(30,41,59,0.9)', 'rgba(15,23,42,0.74)']} style={styles.cardInner}>
              <View style={styles.rowTop}>
                <View>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                  <Text style={styles.trackMood}>{track.mood}</Text>
                </View>

                <View style={[styles.playBtn, isActive && styles.playBtnActive]}>
                  {isPlaying ? <Pause color="#EDE9FE" size={18} /> : <Play color="#EDE9FE" size={18} />}
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
              </View>

              <Waveform active={isPlaying && isActive} />
            </LinearGradient>
          </BlurView>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function SoundscapesScreen({ navigation }) {
  const soundRef = useRef(null);
  const [activeId, setActiveId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const statusListener = (trackId) => (status) => {
    if (!status.isLoaded) return;

    setStatusMap((prev) => ({
      ...prev,
      [trackId]: {
        duration: status.durationMillis ?? 1,
        position: status.positionMillis ?? 0,
      },
    }));

    if (status.didJustFinish) {
      setIsPlaying(false);
      setActiveId(null);
    }
  };

  const toggleTrack = async (track) => {
    const isSame = activeId === track.id;

    if (isSame && soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const { sound } = await Audio.Sound.createAsync(track.source, { shouldPlay: true }, statusListener(track.id));
    soundRef.current = sound;
    setActiveId(track.id);
    setIsPlaying(true);
  };

  const progressByTrack = useMemo(() => {
    const result = {};
    TRACKS.forEach((track) => {
      const item = statusMap[track.id];
      result[track.id] = item ? item.position / Math.max(item.duration, 1) : 0;
    });
    return result;
  }, [statusMap]);

  return (
    <LinearGradient colors={['#0B122F', '#1E1B4B', '#0F172A']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={20} color="#EDE9FE" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Soundscapes</Text>
        </View>

        <Text style={styles.subtitle}>Classical calm • one immersive track at a time.</Text>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {TRACKS.map((track, index) => (
            <TrackCard
              key={track.id}
              track={track}
              delay={index * 70}
              isActive={track.id === activeId}
              isPlaying={isPlaying && track.id === activeId}
              progress={progressByTrack[track.id] ?? 0}
              onToggle={() => toggleTrack(track)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: 10 },
  headerRow: { paddingHorizontal: 18 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: '#EDE9FE', fontSize: 14 },
  title: { color: '#EDE9FE', fontSize: 30, fontWeight: '700', marginTop: 8 },
  subtitle: { color: 'rgba(221,214,254,0.85)', marginTop: 8, paddingHorizontal: 18 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 30, gap: 14 },
  cardWrap: { position: 'relative' },
  pulseLayer: {
    position: 'absolute',
    inset: 3,
    borderRadius: 22,
    backgroundColor: 'rgba(168,85,247,0.5)',
  },
  cardShadowWrap: {
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#A78BFA',
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  cardBlur: { borderRadius: 22, overflow: 'hidden' },
  cardInner: { borderRadius: 22, padding: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', maxWidth: '80%' },
  trackMood: { color: 'rgba(226,232,240,0.8)', marginTop: 4 },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(221,214,254,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  playBtnActive: {
    borderColor: 'rgba(196,181,253,0.95)',
    backgroundColor: 'rgba(139,92,246,0.35)',
  },
  progressTrack: {
    marginTop: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148,163,184,0.28)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C4B5FD',
    borderRadius: 3,
  },
  waveWrap: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 36,
  },
  waveBar: {
    width: 8,
    borderRadius: 99,
    backgroundColor: '#A78BFA',
  },
});
