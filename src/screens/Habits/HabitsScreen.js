import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Animated as RNAnimated,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Bell, Check, TrendingUp, Pencil, Trash2 } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData, todayISO } from '../../contexts/AppDataContext';
import CoinBalancePill from '../../components/common/CoinBalancePill';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';
import AddHabitBottomSheet from './AddHabitBottomSheet';
import { showConfirm } from '../../utils/alert';
import { scheduleHabitNudges, cancelHabitNudges } from '../../utils/reminders';

// Richer gradient palette for habit cards
const HABIT_GRADIENTS = [
  ['#FF6B6B', '#FF8E53'],
  ['#4ECDC4', '#44A08D'],
  ['#A78BFA', '#7C3AED'],
  ['#43E97B', '#38F9D7'],
  ['#F093FB', '#F5576C'],
  ['#4FACFE', '#00F2FE'],
  ['#FFD93D', '#FF6B6B'],
  ['#6BCB77', '#4D96FF'],
  ['#FA709A', '#FEE140'],
  ['#667EEA', '#764BA2'],
  ['#30CFD0', '#330867'],
  ['#FF9A9E', '#FECFEF'],
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) {
    h = (h * 31 + String(s).charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function gradientForHabit(habit) {
  if (Array.isArray(habit.gradient) && habit.gradient.length === 2) {
    return habit.gradient;
  }
  return HABIT_GRADIENTS[hashStr(habit.id) % HABIT_GRADIENTS.length];
}

function CoinFly({ tick }) {
  const translate = useRef(new RNAnimated.ValueXY({ x: 0, y: 0 })).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!tick) return;
    translate.setValue({ x: 0, y: 0 });
    opacity.setValue(1);
    RNAnimated.parallel([
      RNAnimated.timing(translate, {
        toValue: { x: 130, y: -480 },
        duration: 900,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [tick]);

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[styles.coinFx, { opacity, transform: translate.getTranslateTransform() }]}
    >
      <Text style={styles.coinFxText}>🪙✨</Text>
    </RNAnimated.View>
  );
}

// Springs in at once (native driver, ~140ms) so the tick shows the moment the circle is pressed
const TickBubble = React.memo(function TickBubble({ done, color }) {
  const scale = useRef(new RNAnimated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    RNAnimated.spring(scale, {
      toValue: done ? 1 : 0,
      speed: 40,
      bounciness: done ? 10 : 0,
      useNativeDriver: true,
    }).start();
  }, [done, scale]);
  return (
    <View
      style={[
        styles.bubble,
        done
          ? { backgroundColor: '#FFFFFF' }
          : { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.55)' },
      ]}
    >
      <RNAnimated.View style={{ transform: [{ scale }], opacity: scale }}>
        <Check size={18} color={color} strokeWidth={3.5} />
      </RNAnimated.View>
    </View>
  );
});

function HabitCard({ habit, onToggle, onEdit, onDelete, highlight }) {
  const doneCount = (habit.completions || []).filter(Boolean).length;
  const totalSlots = habit.timeSlots?.length || 0;
  const allDone = doneCount === totalSlots && totalSlots > 0;
  const gradient = gradientForHabit(habit);

  const streak = habit.streak || 0;
  const targetDays = habit.targetDays ?? habit.metadata?.targetDays;
  const dayNumber = targetDays ? streak + 1 : null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={[
        styles.cardShadow,
        highlight && styles.cardHighlight,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.habitTitle} numberOfLines={2}>
              {habit.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Bell size={10} color="#FFFFFF" />
                <Text style={styles.metaText}>
                  {habit.reminder || 'Daily'}
                </Text>
              </View>
              {streak > 0 && (
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>
                    🔥 {streak}d
                  </Text>
                </View>
              )}
              {targetDays ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaText}>
                    Day {dayNumber}/{targetDays}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => onEdit(habit)}
              style={styles.iconBtn}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Pencil size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(habit.id, habit.name)}
              style={styles.iconBtn}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Trash2 size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress line */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {doneCount} of {totalSlots} today
          </Text>
          {allDone && (
            <View style={styles.allDoneChip}>
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.allDoneText}>DONE</Text>
            </View>
          )}
        </View>

        {/* Slot bubbles */}
        <View style={styles.bubblesRow}>
          {habit.timeSlots.map((slot, i) => {
            const done = Boolean(habit.completions?.[i]);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => onToggle(habit.id, i)}
                style={styles.bubbleCol}
                activeOpacity={0.75}
              >
                <TickBubble done={done} color={gradient[0]} />
                <Text style={styles.bubbleLabel}>{slot}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export default function HabitsScreen({ navigation, route }) {
  const { theme, isDark, registerHabitCompletion, unregisterHabitCompletion } = useTheme();
  const { habits, addHabit, updateHabit, toggleHabitSlot, deleteHabit, habitStats } = useAppData();

  const bottomSheetRef = useRef(null);
  const [coinFxTick, setCoinFxTick] = useState(0);
  const [editingHabit, setEditingHabit] = useState(null);
  const [highlightedHabitId, setHighlightedHabitId] = useState(null);

  // Handle navigation param: scroll to + highlight a habit
  useEffect(() => {
    const targetId = route?.params?.highlightHabitId;
    if (!targetId) return;

    setHighlightedHabitId(targetId);
    const timer = setTimeout(() => setHighlightedHabitId(null), 2400);
    navigation.setParams({ highlightHabitId: undefined, _ts: undefined });

    return () => clearTimeout(timer);
  }, [route?.params?.highlightHabitId, route?.params?._ts, navigation]);

  // Yesterday's ticks are archived and reset by AppDataContext when the day changes.

  const handleToggle = useCallback(
    async (id, idx) => {
      const habit = habits.find((h) => h.id === id);
      if (!habit) return;

      // The tick appears first (optimistic); coins follow the real result.
      const result = await toggleHabitSlot(id, idx);
      if (!result) return;

      if (result.checked) {
        setCoinFxTick((t) => t + 1);
        registerHabitCompletion();

        if (result.allDone) {
          Toast.show({
            type: 'success',
            text1: 'All done for today! 🌿',
            text2: result.streak > 1 ? `🔥 ${result.streak} day streak` : '+2 🪙',
          });

          const target = habit.targetDays ?? habit.metadata?.targetDays;
          const startedAt = habit.metadata?.startedAt;
          if (target && startedAt) {
            const daysElapsed =
              Math.floor((new Date(todayISO()) - new Date(startedAt)) / 86400000) + 1;
            if (daysElapsed >= target) {
              setTimeout(() => {
                Toast.show({
                  type: 'success',
                  text1: `🎉 ${target}-day goal complete!`,
                  text2: habit.name,
                  visibilityTime: 4000,
                });
              }, 2000);
            }
          }
        }
      } else {
        unregisterHabitCompletion();
      }
    },
    [habits, toggleHabitSlot, registerHabitCompletion, unregisterHabitCompletion]
  );

  const handleEdit = useCallback((habit) => {
    setEditingHabit(habit);
    setTimeout(() => bottomSheetRef.current?.expand(), 60);
  }, []);

  const handleDelete = useCallback(
    async (id, name) => {
      const ok = await showConfirm(
        'Delete habit?',
        `"${name}" and its history will be removed.`,
        'Delete',
        'Cancel'
      );
      if (!ok) return;

      await cancelHabitNudges(id);
      await deleteHabit(id);
      Toast.show({ type: 'info', text1: 'Habit deleted', text2: name });
    },
    [deleteHabit]
  );

  const handleSheetSubmit = useCallback(
    async (habitObj) => {
      if (editingHabit) {
        await updateHabit(editingHabit.id, (prev) => ({
          ...prev,
          name: habitObj.name,
          title: habitObj.name,
          timeSlots: habitObj.timeSlots,
          completions: habitObj.completions,
          gradient: habitObj.gradient,
          slotTimes: habitObj.slotTimes || {},
          durationMins: habitObj.durationMins || null,
          metadata: {
            ...(prev.metadata || {}),
            timeSlots: habitObj.timeSlots,
            completions: habitObj.completions,
            gradient: habitObj.gradient,
            targetDays: habitObj.targetDays ?? prev.metadata?.targetDays ?? null,
            slotTimes: habitObj.slotTimes || {},
            durationMins: habitObj.durationMins || null,
          },
        }));

        await scheduleHabitNudges({
          id: editingHabit.id,
          name: habitObj.name,
          timeSlots: habitObj.timeSlots,
          slotTimes: habitObj.slotTimes || {},
        });

        setEditingHabit(null);
        Toast.show({ type: 'success', text1: 'Habit updated', text2: habitObj.name });
      } else {
        const created = await addHabit(habitObj);

        if (created?.id) {
          await scheduleHabitNudges({
            id: created.id,
            name: habitObj.name,
            timeSlots: habitObj.timeSlots,
            slotTimes: habitObj.slotTimes || {},
          });
        }

        Toast.show({ type: 'success', text1: 'Habit created', text2: habitObj.name });
      }
    },
    [editingHabit, updateHabit, addHabit]
  );

  const handleSheetClose = useCallback(() => setEditingHabit(null), []);

  // Filter active habits (not past target-days)
  const activeHabits = (() => {
    const today = todayISO();
    return habits.filter((h) => {
      const target = h.targetDays ?? h.metadata?.targetDays;
      const startedAt = h.metadata?.startedAt;
      if (!target || !startedAt) return true;
      const daysElapsed =
        Math.floor((new Date(today) - new Date(startedAt)) / 86400000) + 1;
      return daysElapsed <= target;
    });
  })();

  const totalTarget = habitStats.dailyTarget || 0;
  const totalDone = habitStats.todayDone || 0;
  const progressPct = totalTarget > 0 ? Math.min(100, (totalDone / totalTarget) * 100) : 0;
  const streak = habitStats.streakDays || 0;
  const bannerColors = [theme.accentGradient[0], theme.accentGradient[1]];

  return (
    <View style={[styles.root, { backgroundColor: theme.background[0] }]}>
      <AnimatedOrbsBackground
        colors={[
          theme.glow + '40',
          theme.accentGradient[0] + '20',
          theme.accentGradient[1] + '20',
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        <CoinFly tick={coinFxTick} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.mainTitle, { color: theme.text }]}>
                Habits
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Small steps, every day
              </Text>
            </View>
            <CoinBalancePill />
          </View>

          {/* Today banner: built from the habits themselves, nothing fixed */}
          <LinearGradient
            colors={bannerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressBanner}
          >
            <View style={styles.progressBannerHeader}>
              <TrendingUp color="#FFFFFF" size={16} />
              <Text style={styles.progressBannerLabel}>
                {totalTarget === 0
                  ? 'TODAY'
                  : totalDone >= totalTarget
                    ? 'ALL DONE TODAY'
                    : 'TODAY'}
              </Text>
              {streak > 0 ? (
                <Text style={[styles.progressBannerLabel, { marginLeft: 'auto' }]}>
                  🔥 {streak} day{streak === 1 ? '' : 's'}
                </Text>
              ) : null}
            </View>
            <Text style={styles.progressBannerValue}>
              {totalDone}
              <Text style={styles.progressBannerValueDim}> / {totalTarget} check-ins</Text>
            </Text>
            <View style={styles.progressBannerTrack}>
              <View style={[styles.progressBannerFill, { width: `${progressPct}%` }]} />
            </View>
            {(habitStats.weekDays || []).length > 0 ? (
              <View style={styles.weekRow}>
                {habitStats.weekDays.map((d) => (
                  <View key={d.iso} style={styles.weekCol}>
                    <View
                      style={[
                        styles.weekDot,
                        d.total > 0 && { backgroundColor: `rgba(255,255,255,${0.25 + 0.75 * d.ratio})` },
                        d.isToday && styles.weekDotToday,
                      ]}
                    >
                      {d.total > 0 && d.ratio >= 1 ? <Check size={10} color={bannerColors[0]} strokeWidth={4} /> : null}
                    </View>
                    <Text style={styles.weekLabel}>{d.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {habitStats.weekRate > 0 ? (
              <Text style={styles.weekRate}>{habitStats.weekRate}% of check-ins this week</Text>
            ) : null}
          </LinearGradient>

          {/* Habits list */}
          {activeHabits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No habits yet
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Tap the + button to start a new habit
              </Text>
            </View>
          ) : (
            activeHabits.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
                highlight={highlightedHabitId === h.id}
              />
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => bottomSheetRef.current?.expand()}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#4FD1C5', '#2CB1BC']} style={styles.fabGradient}>
            <Plus color="white" size={30} />
          </LinearGradient>
        </TouchableOpacity>

        <AddHabitBottomSheet
          ref={bottomSheetRef}
          onSubmit={handleSheetSubmit}
          initialHabit={editingHabit}
          onClose={handleSheetClose}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  weekCol: { alignItems: 'center', flex: 1 },
  weekDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotToday: { borderWidth: 2, borderColor: '#FFFFFF' },
  weekLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700', marginTop: 4 },
  weekRate: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 10 },
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: '600' },

  // Progress banner
  progressBanner: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  progressBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  progressBannerLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressBannerValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  progressBannerValueDim: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 20,
    fontWeight: '700',
  },
  progressBannerTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressBannerFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FCD34D',
  },

  // Habit card
  cardShadow: {
    marginBottom: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardHighlight: {
    shadowColor: '#6366F1',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  card: {
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  habitTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.1,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress line
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  progressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  allDoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  allDoneText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  // Slot bubbles
  bubblesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  bubbleCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  bubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 10,
    shadowColor: '#2CB1BC',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  fabGradient: {
    flex: 1,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Coin fly
  coinFx: { position: 'absolute', zIndex: 1000, top: '50%', left: '40%' },
  coinFxText: { fontSize: 32 },
});