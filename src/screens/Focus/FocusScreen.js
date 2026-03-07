import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Pause, Mic, RefreshCcw } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { Audio } from 'expo-av';
import TimerRing from '../../components/focus/TimerRing';
import SoundCard from '../../components/focus/SoundCard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { formatTime } from '../../utils/formatTime';

const placeholderSounds = [
  { name: 'Rain', file: require('../../../assets/sounds/rain.mp3') }, // Assume assets
  // Add more
];

const FocusScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [time, setTime] = React.useState(1500); // 25 min
  const [sound, setSound] = React.useState(null);
  const bottomSheetRef = React.useRef(null);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      timerRef.current = setInterval(() => setTime(t => t > 0 ? t - 1 : 0), 1000);
    } else {
      clearInterval(timerRef.current);
    }
  };

  const reset = () => {
    setTime(1500);
    setIsPlaying(false);
  };

  const selectSound = async (selected) => {
    if (sound) await sound.unloadAsync();
    const { sound: newSound } = await Audio.Sound.createAsync(selected.file);
    setSound(newSound);
    await newSound.playAsync();
    bottomSheetRef.current.close();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Focus Session</Text>
      <TimerRing progress={time / 1500} isPlaying={isPlaying} />
      <View style={styles.controls}>
        <TouchableOpacity onPress={togglePlay}>
          {isPlaying ? <Pause color={themeColors.primary} size={50} /> : <Play color={themeColors.primary} size={50} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => bottomSheetRef.current.expand()} style={{ marginLeft: 20 }}>
          <Mic color={themeColors.primary} size={40} />
        </TouchableOpacity>
        <TouchableOpacity onPress={reset} style={{ marginLeft: 20 }}>
          <RefreshCcw color={themeColors.primary} size={40} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.time, { color: themeColors.text }]}>{formatTime(time)}</Text>
      <TouchableOpacity style={styles.unlock}>
        <Text style={[styles.unlockText, { color: themeColors.text }]}>Unlock Music</Text>
      </TouchableOpacity>
      <BottomSheet ref={bottomSheetRef} snapPoints={['50%']}>
        <View style={styles.sheetContent}>
          {placeholderSounds.map(s => <SoundCard key={s.name} sound={s} onSelect={selectSound} />)}
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  time: {
    fontSize: 40,
    marginTop: 20,
  },
  unlock: {
    marginTop: 20,
  },
  unlockText: {
    fontSize: 16,
  },
  sheetContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});

export default FocusScreen;