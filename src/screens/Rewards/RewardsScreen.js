import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Award, Lock, Sparkles, Gift } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const REWARDS = [
  { name: 'Focus Rookie', points: 120, unlocked: true, celebration: 'Great momentum! 🎉' },
  { name: '7-Day Flow', points: 240, unlocked: true, celebration: 'Consistency unlocked! ✨' },
  { name: 'Theme Pack', points: 320, unlocked: false, celebration: '' },
  { name: 'Mini Boost', points: 480, unlocked: false, celebration: '' },
];

export default function RewardsScreen() {
  const { theme, isDark } = useTheme();
  const sparkle = useSharedValue(0.4);

  React.useEffect(() => {
    sparkle.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [sparkle]);

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: 0.9 + sparkle.value * 0.2 }],
  }));

  const unlockedCount = useMemo(() => REWARDS.filter((r) => r.unlocked).length, []);
  const totalPoints = useMemo(() => REWARDS.filter((r) => r.unlocked).reduce((s, r) => s + r.points, 0), []);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Rewards</Text>
          <Animated.View style={sparkleStyle}>
            <Sparkles color={theme.accentGradient[1]} size={22} />
          </Animated.View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
          <Text style={[styles.statsText, { color: theme.text }]}>{unlockedCount}/{REWARDS.length} badges unlocked</Text>
          <Text style={[styles.statsText, { color: theme.textSecondary }]}>{totalPoints} dopamine points earned</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(unlockedCount / REWARDS.length) * 100}%`, backgroundColor: theme.accentGradient[0] }]} />
          </View>
          <Text style={[styles.nextText, { color: theme.textSecondary }]}>120 points to next reward chest</Text>
        </View>

        {REWARDS.map((reward) => (
          <TouchableOpacity key={reward.name} activeOpacity={0.9} style={styles.rewardTouch}>
            <LinearGradient
              colors={reward.unlocked ? [theme.accentGradient[0], theme.accentGradient[2]] : isDark ? ['#1E293B', '#334155'] : ['#FFFFFF', '#F1F5F9']}
              style={styles.rewardCard}
            >
              <View style={styles.rewardLeft}>
                {reward.unlocked ? <Award color="#FFFFFF" size={22} /> : <Lock color={theme.textSecondary} size={22} />}
                <View>
                  <Text style={[styles.rewardName, { color: reward.unlocked ? '#FFFFFF' : theme.text }]}>{reward.name}</Text>
                  <Text style={[styles.rewardPoints, { color: reward.unlocked ? '#E0E7FF' : theme.textSecondary }]}>{reward.points} pts</Text>
                </View>
              </View>
              <View style={styles.rewardRight}>
                <Gift color={reward.unlocked ? '#FFFFFF' : theme.textSecondary} size={18} />
              </View>
            </LinearGradient>
            {reward.unlocked && <Text style={[styles.celebrateText, { color: theme.textSecondary }]}>{reward.celebration}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 36 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '700' },
  statsCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    marginBottom: 16,
  },
  statsText: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  progressTrack: { height: 8, borderRadius: 10, backgroundColor: '#CBD5E1', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  nextText: { fontSize: 12, marginTop: 8 },
  rewardTouch: { marginBottom: 12 },
  rewardCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardName: { fontSize: 15, fontWeight: '700' },
  rewardPoints: { fontSize: 12, marginTop: 2 },
  rewardRight: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  celebrateText: { marginTop: 6, marginLeft: 4, fontSize: 12 },
});
