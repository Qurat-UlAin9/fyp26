import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Headphones, Pause, Play, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

export default function ControlButtons({ isRunning, onReset, onTogglePlay, onOpenSound }) {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.smallButton, { backgroundColor: isDark ? 'rgba(148,163,184,0.14)' : '#E2E8F0' }]} onPress={onReset}>
        <RotateCcw size={22} color={theme.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onTogglePlay} activeOpacity={0.9} style={styles.playWrapper}>
        <LinearGradient colors={['#38BDF8', '#60A5FA', '#A78BFA']} style={styles.playButton}>
          {isRunning ? <Pause size={36} color="#FFFFFF" /> : <Play size={36} color="#FFFFFF" />}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.smallButton, { backgroundColor: isDark ? 'rgba(148,163,184,0.14)' : '#E2E8F0' }]} onPress={onOpenSound}>
        <Headphones size={22} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '85%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 22,
  },
  smallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playWrapper: {
    shadowColor: '#60A5FA',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  playButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
