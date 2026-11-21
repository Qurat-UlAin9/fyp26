import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import { queueCoachEvent } from '../../utils/coachNav';
import { goToCoach } from '../../utils/navigationRef';

// Shows a confetti celebration whenever the user unlocks a new badge, from anywhere in the app
// (also when the coach ticked something for them). One tap tells the coach, who congratulates.
const SEEN_KEY = 'celebrated_badges_v1';
const COLORS = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FACC15'];
const PIECES = 36;

function Piece({ index, width, height }) {
  const cfg = useRef({
    x: Math.random() * width,
    delay: Math.random() * 600,
    dur: 1900 + Math.random() * 1500,
    size: 6 + Math.random() * 7,
    color: COLORS[index % COLORS.length],
    spin: Math.random() * 720 - 360,
    drift: Math.random() * 90 - 45,
  }).current;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(cfg.delay, withTiming(1, { duration: cfg.dur, easing: Easing.in(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.85 ? 1 : Math.max(0, (1 - p.value) * 6.6),
    transform: [
      { translateY: -30 + p.value * (height + 60) },
      { translateX: cfg.drift * p.value },
      { rotate: `${cfg.spin * p.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: cfg.x, width: cfg.size, height: cfg.size * 1.6, borderRadius: 2, backgroundColor: cfg.color },
        style,
      ]}
    />
  );
}

function Celebration({ badge, onClose, onShare }) {
  const { theme, isDark } = useTheme();
  const { width, height } = Dimensions.get('window');
  const pop = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 7, stiffness: 120 });
    wiggle.value = withDelay(
      500,
      withRepeat(withSequence(withTiming(-8, { duration: 160 }), withTiming(8, { duration: 160 })), 4, true)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badge.id]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ scale: 0.6 + 0.4 * pop.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { rotate: `${wiggle.value}deg` }],
  }));

  const pieces = useMemo(() => Array.from({ length: PIECES }, (_, i) => i), []);

  return (
    <View style={styles.overlay}>
      {pieces.map((i) => (
        <Piece key={`${badge.id}-${i}`} index={i} width={width} height={height} />
      ))}

      <Animated.View
        style={[
          styles.card,
          { backgroundColor: isDark ? '#1E1B4B' : '#FFFFFF', borderColor: theme.border },
          cardStyle,
        ]}
      >
        <Text style={[styles.kicker, { color: theme.accentGradient[0] }]}>BADGE UNLOCKED</Text>
        <Animated.Text style={[styles.icon, iconStyle]}>{badge.icon}</Animated.Text>
        <Text style={[styles.name, { color: theme.text }]}>{badge.name}</Text>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>{badge.description}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onShare}
          style={[styles.primary, { backgroundColor: theme.accentGradient[0] }]}
        >
          <Text style={styles.primaryText}>Celebrate with Compass 🎉</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.close}>
          <Text style={[styles.closeText, { color: theme.textSecondary }]}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const dayISO = (offset = 0) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

export default function CelebrationHost() {
  const {
    titles, hydrated, syncHabitStreak, rewardsSynced, refreshRewards, markCelebrated, celebratedBadges,
  } = useTheme();
  const { habits, profile, hydrated: dataHydrated } = useAppData();
  const syncedEmailRef = useRef(null);

  // Logged in: load coins, unlocks and stats from the server (copies old local rewards up once)
  const email = profile?.email || '';
  useEffect(() => {
    if (!dataHydrated || !email || syncedEmailRef.current === email) return;
    syncedEmailRef.current = email;
    refreshRewards(email).then((ok) => {
      if (!ok) syncedEmailRef.current = null; // try again next time this runs
    });
  }, [dataHydrated, email, refreshRewards]);
  const seenRef = useRef(new Set());
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState([]);

  // Streak badges follow the real habit streaks: the longest one that is still alive
  // (finished today or yesterday). A streak that was broken earlier counts as 0.
  useEffect(() => {
    if (!hydrated || !Array.isArray(habits)) return;
    const today = dayISO(0);
    const yesterday = dayISO(1);
    const best = habits.reduce((max, h) => {
      const last = h.metadata?.lastCompletionDate;
      const alive = last === today || last === yesterday;
      return alive ? Math.max(max, Number(h.streak ?? h.metadata?.streak) || 0) : max;
    }, 0);
    syncHabitStreak(best);
  }, [habits, hydrated, syncHabitStreak]);

  const persist = () => {
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seenRef.current])).catch(() => undefined);
  };

  // Once the server's rewards are loaded, learn which badges were already celebrated
  // (on this phone or on the server). First run ever: everything already unlocked counts as seen,
  // so nobody gets a backlog of confetti.
  useEffect(() => {
    if (!rewardsSynced || ready) return;
    const unlockedNow = titles.filter((t) => t.unlocked).map((t) => t.id);
    AsyncStorage.getItem(SEEN_KEY)
      .then((raw) => {
        const local = raw ? JSON.parse(raw) : null;
        const known = new Set([...(local || []), ...(celebratedBadges || [])]);
        if (!local && known.size === 0) {
          unlockedNow.forEach((id) => known.add(id));
          markCelebrated(unlockedNow);
        }
        seenRef.current = known;
        persist();
      })
      .catch(() => {
        seenRef.current = new Set([...(celebratedBadges || []), ...unlockedNow]);
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardsSynced]);

  // A badge that is unlocked now but not yet celebrated -> queue it
  useEffect(() => {
    if (!ready) return;
    const fresh = titles.filter((t) => t.unlocked && !seenRef.current.has(t.id));
    if (fresh.length === 0) return;
    fresh.forEach((t) => seenRef.current.add(t.id));
    persist();
    markCelebrated(fresh.map((t) => t.id));
    setQueue((q) => [...q, ...fresh]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titles, ready]);

  const current = queue[0];
  if (!current) return null;

  const next = () => setQueue((q) => q.slice(1));
  const share = () => {
    queueCoachEvent(`I just unlocked the "${current.name}" badge (${current.description}).`);
    next();
    goToCoach();
  };

  return <Celebration badge={current} onClose={next} onShare={share} />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 60,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 340, borderRadius: 26, borderWidth: 1, padding: 22, alignItems: 'center' },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  icon: { fontSize: 64, marginVertical: 12 },
  name: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  primary: { borderRadius: 16, paddingVertical: 13, paddingHorizontal: 20, alignSelf: 'stretch', alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  close: { marginTop: 12 },
  closeText: { fontSize: 12, fontWeight: '700' },
});
