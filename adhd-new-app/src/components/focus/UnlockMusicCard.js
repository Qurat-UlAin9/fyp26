import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Music2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function UnlockMusicCard({ completedSessions }) {
  const { isDark } = useTheme();

  const sessionsLeft = Math.max(0, 3 - completedSessions);
  const isUnlocked = sessionsLeft === 0;
  const progressPercent = Math.min(100, (completedSessions / 3) * 100);

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const textColor = isDark ? '#E0F2FE' : '#0F172A';
  const subtitleColor = isDark ? '#475569' : '#94A3B8';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: isUnlocked ? 'rgba(56,189,248,0.2)' : isDark ? 'rgba(71,85,105,0.3)' : 'rgba(148,163,184,0.15)' }]}>
        {isUnlocked
          ? <Music2 size={20} color="#38BDF8" />
          : <Lock size={18} color={isDark ? '#475569' : '#94A3B8'} />
        }
      </View>

      {/* Text + progress */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: textColor }]}>
            {isUnlocked ? 'Music Unlocked! 🎉' : 'Unlock Music'}
          </Text>
          <Text style={[styles.counter, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
            {completedSessions}/3
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          {isUnlocked
            ? 'Your playlist is ready to play'
            : `${sessionsLeft} more session${sessionsLeft !== 1 ? 's' : ''} to unlock your playlist`
          }
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }]}>
          <LinearGradient
            colors={['#22D3EE', '#A78BFA']}
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  counter: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    minWidth: 8,
  },
});