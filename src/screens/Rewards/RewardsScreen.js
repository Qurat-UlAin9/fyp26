import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Crown, Lock, Music, PauseCircle, PlayCircle, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';

function TitleCard({ item, unlocked, theme }) {
  const pulse = useSharedValue(0.8);
  React.useEffect(() => {
    if (!unlocked) return;
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0.75, { duration: 1400 })), -1, true);
  }, [pulse, unlocked]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.titleCard, !unlocked && styles.lockedCard]}>
      {unlocked && <Animated.View style={[styles.titleGlow, glowStyle]} />}
      <Text style={styles.titleEmoji}>{item.icon}</Text>
      <Text style={[styles.titleName, { color: theme.text }]}>{item.name}</Text>
      <Text style={[styles.titleStatus, { color: theme.textSecondary }]}>{unlocked ? 'Unlocked' : 'Locked'}</Text>
      {!unlocked && <Lock size={16} color={theme.textSecondary} />}
    </View>
  );
}

export default function RewardsScreen() {
  const {
    theme,
    titles,
    themes,
    coins,
    unlockedThemes,
    selectedThemeId,
    unlockTheme,
    selectTheme,
    sounds,
    unlockedSounds,
    selectedSoundId,
    unlockSound,
    selectSound,
    toggleSoundPlayback,
    isSoundPlaying,
    stats,
  } = useTheme();

  const orbColors = useMemo(() => [theme.glow + '55', theme.accentGradient[0] + '35', theme.accentGradient[1] + '35'], [theme]);
  const coinPulse = useSharedValue(1);
  React.useEffect(() => { coinPulse.value = withRepeat(withSequence(withTiming(1.07, { duration: 900 }), withTiming(1, { duration: 900 })), -1, true); }, [coinPulse]);
  const coinStyle = useAnimatedStyle(() => ({ transform: [{ scale: coinPulse.value }] }));

  const onThemePress = (id) => {
    if (!unlockedThemes.includes(id)) {
      const result = unlockTheme(id);
      if (!result.ok) return Alert.alert('Not enough coins', 'Keep completing tasks and habits to earn coins.');
    }
    selectTheme(id);
  };

  const onSoundPress = (id) => {
    if (!unlockedSounds.includes(id)) {
      const result = unlockSound(id);
      if (!result.ok) return Alert.alert('Not enough coins', 'You need more coins to unlock this sound.');
    }
    selectSound(id);
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <AnimatedOrbsBackground colors={orbColors} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BlurView intensity={45} tint={theme.mode} style={[styles.hero, { borderColor: theme.border }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.heading, { color: theme.text }]}>Rewards System</Text>
            <Animated.View style={[styles.coinPill, coinStyle]}><Text style={styles.coinText}>🪙 {coins}</Text></Animated.View>
          </View>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>Gamified progress with themes, titles, and relaxing sounds.</Text>
          <Text style={[styles.progress, { color: theme.textSecondary }]}>Tasks: {stats.tasksCompleted} • Habit streak: {stats.habitStreak} • Focus: {stats.focusMinutes} min</Text>
        </BlurView>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Titles (Achievements)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
          {titles.map((title) => (
            <TitleCard key={title.id} item={title} unlocked={title.unlocked} theme={theme} />
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>🎨 Themes</Text>
        {themes.map((item) => {
          const selected = selectedThemeId === item.id;
          const unlocked = unlockedThemes.includes(item.id);
          return (
            <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => onThemePress(item.id)}>
              <BlurView intensity={42} tint={theme.mode} style={[styles.optionCard, { borderColor: selected ? theme.glow : theme.border }]}>
                <LinearGradient colors={item.background} style={styles.themePreview}><View style={styles.previewBadge}><Text style={styles.previewBadgeText}>{item.mode === 'dark' ? 'Dark' : 'Light'}</Text></View></LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.optionMeta, { color: theme.textSecondary }]}>{item.mode === 'dark' ? 'Dark mode' : 'Light mode'} • {item.cost === 0 ? 'Free' : `${item.cost} coins`}</Text>
                </View>
                {unlocked ? <Sparkles color={selected ? theme.glow : theme.textSecondary} size={18} /> : <Lock color={theme.textSecondary} size={18} />}
              </BlurView>
            </TouchableOpacity>
          );
        })}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>🎵 Sounds</Text>
        {sounds.map((item) => {
          const unlocked = unlockedSounds.includes(item.id);
          const active = selectedSoundId === item.id;
          return (
            <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => onSoundPress(item.id)}>
              <BlurView intensity={42} tint={theme.mode} style={[styles.optionCard, { borderColor: active ? theme.glow : theme.border }]}>
                <View style={[styles.soundIcon, { backgroundColor: theme.card }]}><Music color={theme.accentGradient[0]} size={18} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[styles.optionMeta, { color: theme.textSecondary }]}>{item.cost === 0 ? 'Free' : `${item.cost} coins`}</Text>
                </View>
                {!unlocked && <Lock color={theme.textSecondary} size={18} />}
                {unlocked && active && (
                  <TouchableOpacity onPress={toggleSoundPlayback}>
                    {isSoundPlaying ? <PauseCircle color={theme.glow} size={22} /> : <PlayCircle color={theme.glow} size={22} />}
                  </TouchableOpacity>
                )}
              </BlurView>
            </TouchableOpacity>
          );
        })}

        <View style={styles.footerPad} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  hero: { borderRadius: 24, padding: 16, borderWidth: 1, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 28, fontWeight: '800' },
  coinPill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  coinText: { color: '#FDE68A', fontSize: 14, fontWeight: '800' },
  subheading: { marginTop: 8, fontSize: 13 },
  progress: { marginTop: 8, fontSize: 12, fontWeight: '600' },
  sectionTitle: { marginTop: 18, marginBottom: 10, fontSize: 18, fontWeight: '800' },
  horizontalRow: { gap: 12, paddingRight: 12 },
  titleCard: {
    width: 150,
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lockedCard: { opacity: 0.75 },
  titleGlow: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: '#22d3ee', borderRadius: 20 },
  titleEmoji: { fontSize: 28 },
  titleName: { marginTop: 8, color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  titleStatus: { marginTop: 8, color: '#e2e8f0', fontSize: 12, marginBottom: 4 },
  optionCard: {
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  themePreview: { width: 58, height: 58, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end' },
  previewBadge: { backgroundColor: 'rgba(15,23,42,0.5)', paddingVertical: 3 },
  previewBadgeText: { color: '#fff', fontSize: 9, textAlign: 'center', fontWeight: '700' },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionMeta: { marginTop: 4, fontSize: 12 },
  soundIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footerPad: { height: 24 },
});
