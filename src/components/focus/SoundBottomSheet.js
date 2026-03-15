import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

export default function SoundBottomSheet({ sheetRef, sounds, selectedSound, onSelectSound }) {
  const { theme, isDark } = useTheme();

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['48%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: isDark ? 'rgba(15,23,42,0.96)' : '#F8FAFC' }}
      handleIndicatorStyle={{ backgroundColor: theme.textSecondary }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Rhythmic Focus Sounds</Text>
        {sounds.map((sound) => {
          const active = selectedSound === sound.key;
          return (
            <TouchableOpacity key={sound.key} onPress={() => onSelectSound(sound.key)} activeOpacity={0.85}>
              <LinearGradient
                colors={active ? ['#38BDF8', '#60A5FA'] : isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F1F5F9']}
                style={[styles.soundCard, active && styles.activeCard]}
              >
                <Text style={[styles.soundText, { color: active ? '#FFFFFF' : theme.text }]}>{sound.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  soundCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  activeCard: {
    shadowColor: '#38BDF8',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  soundText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
