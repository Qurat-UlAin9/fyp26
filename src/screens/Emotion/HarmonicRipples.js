import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useTheme } from '../../contexts/ThemeContext';

const LAYERS = [
  { id: 'r1', size: 120, color: '#60A5FA', src: require('../../../assets/sounds/Notes/Ripple1.mp3') },
  { id: 'r2', size: 180, color: '#A78BFA', src: require('../../../assets/sounds/Notes/Ripple2.mp3') },
  { id: 'r3', size: 240, color: '#5EEAD4', src: require('../../../assets/sounds/Notes/Ripple3.wav') },
];

export default function HarmonicRipples({ navigation }) {
  const { theme } = useTheme();
  const [activeIds, setActiveIds] = useState([]);
  const soundsRef = React.useRef({});

  useEffect(() => {
    return () => {
      Object.values(soundsRef.current).forEach(async (sound) => {
        await sound?.stopAsync();
        await sound?.unloadAsync();
      });
    };
  }, []);

  const toggleLayer = async (layer) => {
    if (!soundsRef.current[layer.id]) {
      const { sound } = await Audio.Sound.createAsync(layer.src, { isLooping: true, shouldPlay: false, volume: 0.45 });
      soundsRef.current[layer.id] = sound;
    }
    const snd = soundsRef.current[layer.id];
    const isActive = activeIds.includes(layer.id);
    if (isActive) {
      await snd.pauseAsync();
      setActiveIds((prev) => prev.filter((id) => id !== layer.id));
    } else {
      await snd.playAsync();
      setActiveIds((prev) => [...prev, layer.id]);
    }
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { borderColor: theme.border }]} onPress={() => navigation.goBack()}>
            <ChevronLeft color={theme.text} size={20} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>Harmonic Ripples</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Tap a ring to start/stop sound and lights.</Text>

        <View style={styles.centerWrap}>
          {[...LAYERS].reverse().map((layer) => {
            const active = activeIds.includes(layer.id);
            return (
              <Pressable
                key={layer.id}
                onPress={() => toggleLayer(layer)}
                style={[
                  styles.ring,
                  {
                    width: layer.size,
                    height: layer.size,
                    borderRadius: layer.size / 2,
                    borderColor: layer.color,
                    backgroundColor: active ? `${layer.color}44` : 'transparent',
                    shadowColor: layer.color,
                    shadowOpacity: active ? 0.9 : 0.12,
                  },
                ]}
              />
            );
          })}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { marginTop: 12, fontSize: 14 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
});
