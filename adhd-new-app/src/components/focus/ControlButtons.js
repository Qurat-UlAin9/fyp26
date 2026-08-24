import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Headphones, Pause, Play, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

export default function ControlButtons({ isRunning, onReset, onTogglePlay, onOpenSound }) {
  const { theme, isDark } = useTheme();

  const sideButtonBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const sideButtonBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)';

  return (
    <View style={styles.row}>
      {/* Reset */}
      <TouchableOpacity
        style={[styles.sideButton, { backgroundColor: sideButtonBg, borderColor: sideButtonBorder }]}
        onPress={onReset}
        activeOpacity={0.7}
      >
        <RotateCcw size={20} color={isDark ? '#64748B' : '#94A3B8'} />
      </TouchableOpacity>

      {/* Play / Pause — main CTA */}
      <TouchableOpacity onPress={onTogglePlay} activeOpacity={0.88} style={styles.playWrapper}>
        <LinearGradient
          colors={isRunning ? ['#F472B6', '#A78BFA', '#60A5FA'] : ['#22D3EE', '#60A5FA', '#A78BFA']}
          style={styles.playButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isRunning
            ? <Pause size={34} color="#FFFFFF" strokeWidth={2.2} />
            : <Play size={34} color="#FFFFFF" strokeWidth={2.2} style={{ marginLeft: 3 }} />
          }
        </LinearGradient>
      </TouchableOpacity>

      {/* Sound */}
      <TouchableOpacity
        style={[styles.sideButton, { backgroundColor: sideButtonBg, borderColor: sideButtonBorder }]}
        onPress={onOpenSound}
        activeOpacity={0.7}
      >
        <Headphones size={20} color={isDark ? '#64748B' : '#94A3B8'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginTop: 28,
    marginBottom: 26,
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playWrapper: {
    shadowColor: '#60A5FA',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});