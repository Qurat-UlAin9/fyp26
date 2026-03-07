import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, RotateCcw, Mic } from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';
import TimerRing from '../../components/focus/TimerRing';
import SoundCard from '../../components/focus/SoundCard';

export default function FocusScreen() {
  const { theme } = useTheme();
  const bottomSheetRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min
  const [isActive, setIsActive] = useState(false);
  const [selectedSound, setSelectedSound] = useState(null);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.timerContainer}>
          <TimerRing progress={timeLeft / (25 * 60)} />
          <View style={styles.timerCenter}>
            <Text style={[styles.timerText, { color: theme.text }]}>{formatTime()}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={resetTimer}>
            <RotateCcw color={theme.textSecondary} size={32} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleTimer} style={styles.playPause}>
            <LinearGradient colors={theme.accentGradient} style={styles.playPauseGradient}>
              {isActive ? <Pause color="#FFF" size={40} /> : <Play color="#FFF" size={40} />}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.expand()}>
            <Mic color={theme.textSecondary} size={32} />
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.unlockCard}>
          <Text style={[styles.unlockText, { color: theme.text }]}>Complete 3 more sessions to unlock your playlist</Text>
          <View style={styles.lockIcon}>🔒</View>
        </GlassCard>
      </View>

      <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={['40%']} enablePanDownToClose backgroundStyle={{ backgroundColor: theme.card }}>
        <BottomSheetView style={styles.bottomSheetContent}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Background Sounds</Text>
          {['Rain', 'Forest', 'Brown Noise', 'Instrumental'].map(sound => (
            <SoundCard
              key={sound}
              title={sound}
              selected={selectedSound === sound}
              onSelect={() => setSelectedSound(sound)}
            />
          ))}
        </BottomSheetView>
      </BottomSheet>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  timerContainer: { width: 250, height: 250, marginBottom: 40, justifyContent: 'center', alignItems: 'center' },
  timerCenter: { position: 'absolute', justifyContent: 'center', alignItems: 'center' },
  timerText: { fontSize: 48, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', width: '80%', justifyContent: 'space-around', marginBottom: 40 },
  playPause: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden' },
  playPauseGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  unlockCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  unlockText: { flex: 1, fontSize: 14 },
  lockIcon: { fontSize: 24, marginLeft: 8 },
  bottomSheetContent: { padding: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
});