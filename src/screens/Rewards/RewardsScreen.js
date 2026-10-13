import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import {
  Check, Lock, Music2, PauseCircle, PlayCircle, Sparkles, Star,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';
import { showAlert } from '../../utils/alert';

/* ---------------------- Badge card ---------------------- */
function BadgeCard({ item, isFeatured, onPress }) {
  const unlocked = item.unlocked;
  const progress = item.progress ?? (unlocked ? 1 : 0);

  const pulse = useSharedValue(0.85);
  useEffect(() => {
    if (!unlocked) {
      pulse.value = 0.85;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400 }),
        withTiming(0.75, { duration: 1400 })
      ),
      -1,
      true
    );
  }, [pulse, unlocked]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const ringColors = unlocked ? ['#F59E0B', '#EF4444'] : ['#94A3B8', '#64748B'];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={styles.badgeCardWrap}
    >
      <View style={styles.badgeCard}>
        {/* Ring + emoji */}
        <View style={styles.ringWrap}>
          <LinearGradient
            colors={ringColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.ringOuter, !unlocked && { opacity: 0.5 }]}
          />
          <View style={styles.ringInner}>
            <Text style={[styles.ringEmoji, !unlocked && { opacity: 0.4 }]}>
              {item.icon}
            </Text>
            {!unlocked && (
              <View style={styles.lockOverlay}>
                <Lock size={14} color="#FFFFFF" strokeWidth={3} />
              </View>
            )}
          </View>

          {isFeatured && unlocked && (
            <View style={styles.featuredStar}>
              <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Title + description */}
        <Text
          style={[styles.badgeName, !unlocked && { opacity: 0.7 }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={styles.badgeDesc} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Status row */}
        {unlocked ? (
          <View style={styles.badgeChipRow}>
            <LinearGradient
              colors={isFeatured ? ['#F59E0B', '#D97706'] : ['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badgeChip}
            >
              <Check size={10} color="#FFFFFF" strokeWidth={4} />
              <Text style={styles.badgeChipText}>
                {isFeatured ? 'FEATURED' : 'UNLOCKED'}
              </Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: '#8B5CF6',
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ---------------------- Theme preview ---------------------- */
function ThemePreview({ item }) {
  const textColor = item.text || '#fff';
  return (
    <LinearGradient colors={item.background} style={styles.themePreview}>
      <Text style={[styles.previewSample, { color: textColor }]}>Aa</Text>
      <View style={styles.previewBadge}>
        <Text style={styles.previewBadgeText}>
          {item.mode === 'dark' ? 'DARK' : 'LIGHT'}
        </Text>
      </View>
    </LinearGradient>
  );
}

/* ---------------------- Main ---------------------- */
export default function RewardsScreen() {
  const {
    theme, titles, themes, coins,
    unlockedThemes, selectedThemeId, unlockTheme, selectTheme,
    sounds, unlockedSounds, selectedSoundId, unlockSound, selectSound,
    toggleSoundPlayback, isSoundPlaying, stats,
    featuredBadgeId, setFeaturedBadge,
  } = useTheme();

  const orbColors = useMemo(
    () => [
      theme.glow + '55',
      theme.accentGradient[0] + '35',
      theme.accentGradient[1] + '35',
    ],
    [theme]
  );

  const unlockedCount = useMemo(
    () => titles.filter((t) => t.unlocked).length,
    [titles]
  );

  const coinPulse = useSharedValue(1);
  useEffect(() => {
    coinPulse.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, [coinPulse]);
  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinPulse.value }],
  }));

  const onThemePress = (id) => {
    if (!unlockedThemes.includes(id)) {
      const result = unlockTheme(id);
      if (!result.ok) {
        showAlert(
          'Not enough coins',
          'Keep completing tasks and habits to earn coins.'
        );
        return;
      }
    }
    selectTheme(id);
  };

  const onSoundPress = (id) => {
    if (!unlockedSounds.includes(id)) {
      const preset = sounds.find((s) => s.id === id);
      const cost = preset?.cost ?? 0;
      showAlert(
        `Unlock "${preset?.name}"?`,
        `Costs ${cost} coins. You have ${coins}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlock',
            onPress: () => {
              const result = unlockSound(id);
              if (!result.ok) {
                showAlert('Not enough coins', 'Keep earning coins to unlock this track.');
                return;
              }
              selectSound(id);
            },
          },
        ]
      );
      return;
    }
    selectSound(id);
  };

  const onBadgePress = (item) => {
    if (!item.unlocked) {
      showAlert(
        item.name,
        `${item.description}\n\nKeep going to unlock it.`
      );
      return;
    }
    const isFeatured = featuredBadgeId === item.id;
    showAlert(
      item.name,
      isFeatured
        ? 'This badge is featured on your profile.'
        : 'Show this badge on your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isFeatured ? 'Remove' : 'Feature it',
          onPress: () => setFeaturedBadge(isFeatured ? null : item.id),
        },
      ]
    );
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <AnimatedOrbsBackground colors={orbColors} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <BlurView
          intensity={45}
          tint={theme.mode}
          style={[styles.hero, { borderColor: theme.border }]}
        >
          <View style={styles.heroTop}>
            <Text style={[styles.heading, { color: theme.text }]}>Rewards</Text>
            <Animated.View
              style={[
                styles.coinPill,
                { borderColor: theme.border, backgroundColor: theme.card },
                coinStyle,
              ]}
            >
              <Text style={[styles.coinText, { color: theme.text }]}>
                🪙 {coins}
              </Text>
            </Animated.View>
          </View>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>
            Badges, themes, and music to keep you moving.
          </Text>
          <Text style={[styles.progress, { color: theme.textSecondary }]}>
            Tasks {stats.tasksCompleted} · Streak {stats.habitStreak}d · Focus{' '}
            {stats.focusMinutes}m
          </Text>
        </BlurView>

        {/* Badges */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            🏆 Badges
          </Text>
          <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
            {unlockedCount}/{titles.length}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalRow}
        >
          {titles.map((item) => (
            <BadgeCard
              key={item.id}
              item={item}
              isFeatured={featuredBadgeId === item.id}
              onPress={onBadgePress}
            />
          ))}
        </ScrollView>

        {/* Themes */}
        <Text
          style={[styles.sectionTitle, { color: theme.text, marginTop: 22 }]}
        >
          🎨 Themes
        </Text>
        {themes.map((item) => {
          const selected = selectedThemeId === item.id;
          const unlocked = unlockedThemes.includes(item.id);
          const affordable = coins >= (item.cost || 0);
          const borderColor = selected ? item.glow || theme.glow : theme.border;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => onThemePress(item.id)}
            >
              <BlurView
                intensity={42}
                tint={theme.mode}
                style={[styles.optionCard, { borderColor }]}
              >
                <ThemePreview item={item} />
                <View style={styles.optionBody}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.optionMeta, { color: theme.textSecondary }]}
                  >
                    {item.mode === 'dark' ? 'Dark' : 'Light'} ·{' '}
                    {item.cost === 0
                      ? 'Free'
                      : unlocked
                        ? 'Owned'
                        : `${item.cost} coins${affordable ? '' : ' · need more'}`}
                  </Text>
                  {selected && (
                    <View style={styles.activeRow}>
                      <Check size={12} color={theme.glow} />
                      <Text style={[styles.activeText, { color: theme.glow }]}>
                        Active
                      </Text>
                    </View>
                  )}
                </View>
                {unlocked ? (
                  <Sparkles
                    color={selected ? theme.glow : theme.textSecondary}
                    size={18}
                  />
                ) : (
                  <Lock color={theme.textSecondary} size={18} />
                )}
              </BlurView>
            </TouchableOpacity>
          );
        })}

        {/* Music */}
        <Text
          style={[styles.sectionTitle, { color: theme.text, marginTop: 22 }]}
        >
          🎵 Music
        </Text>
        {sounds.map((item) => {
          const unlocked = unlockedSounds.includes(item.id);
          const active = selectedSoundId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => onSoundPress(item.id)}
            >
              <BlurView
                intensity={42}
                tint={theme.mode}
                style={[
                  styles.optionCard,
                  { borderColor: active ? theme.glow : theme.border },
                ]}
              >
                <LinearGradient
                  colors={
                    unlocked
                      ? ['#8B5CF6', '#6366F1']
                      : ['#94A3B8', '#64748B']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.soundIcon}
                >
                  <Music2 color="#FFFFFF" size={18} />
                </LinearGradient>
                <View style={styles.optionBody}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.optionMeta, { color: theme.textSecondary }]}
                  >
                    {item.artist} · {item.genre}
                    {item.cost > 0 ? ` · ${item.cost} coins` : ' · Free'}
                  </Text>
                  {active && isSoundPlaying && (
                    <Text style={[styles.nowPlaying, { color: theme.glow }]}>
                      ▶ Now playing
                    </Text>
                  )}
                </View>
                {!unlocked && <Lock color={theme.textSecondary} size={18} />}
                {unlocked && active && (
                  <TouchableOpacity onPress={toggleSoundPlayback} hitSlop={8}>
                    {isSoundPlaying ? (
                      <PauseCircle color={theme.glow} size={26} />
                    ) : (
                      <PlayCircle color={theme.glow} size={26} />
                    )}
                  </TouchableOpacity>
                )}
                {unlocked && !active && (
                  <PlayCircle color={theme.textSecondary} size={22} />
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

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },

  hero: { borderRadius: 24, padding: 16, borderWidth: 1, overflow: 'hidden' },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: { fontSize: 28, fontWeight: '800' },
  coinPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  coinText: { fontSize: 14, fontWeight: '800' },
  subheading: { marginTop: 8, fontSize: 13 },
  progress: { marginTop: 8, fontSize: 12, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '700' },
  horizontalRow: { gap: 12, paddingRight: 12, paddingVertical: 4 },

  // Badge card
  badgeCardWrap: { width: 148 },
  badgeCard: {
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 208,
  },
  ringWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  ringOuter: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  ringInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  ringEmoji: { fontSize: 30 },
  lockOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  featuredStar: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    color: '#94A3B8',
    minHeight: 26,
    marginBottom: 8,
  },
  badgeChipRow: { marginTop: 'auto' },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeChipText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  progressBlock: {
    width: '100%',
    marginTop: 'auto',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textAlign: 'center',
  },

  // Options
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
  optionBody: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionMeta: { marginTop: 4, fontSize: 12 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  activeText: { fontSize: 11, fontWeight: '800' },
  nowPlaying: { fontSize: 11, fontWeight: '800', marginTop: 4, letterSpacing: 0.3 },

  themePreview: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSample: { fontSize: 20, fontWeight: '800' },
  previewBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 2,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 8,
    textAlign: 'center',
    fontWeight: '800',
  },

  soundIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerPad: { height: 24 },
});