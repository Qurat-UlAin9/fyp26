/**
 * TasksScreen.js  — updated to use AppDataContext
 *
 * Changes from original:
 *  - Removed local useState for tasks / history / coins
 *  - tasks, addTask, deleteTask, toggleSubtask now come from useAppData()
 *  - coins come from useTheme() (already existed)
 *  - Everything else (animations, CoinFly, TaskCard UI) is unchanged
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AddTaskBottomSheet from './AddTaskBottomSheet';

// ── context hooks ──────────────────────────────────────────────────────────
import { useAppData } from '../../contexts/AppDataContext';
import { useTheme } from '../../contexts/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW } = Dimensions.get('window');

// ─── Theme palette ────────────────────────────────────────────────────────────
const CARD_THEMES = [
  { id: 'coral',    dot: '#FF6B7A', cardGradient: ['#FF6B7A', '#FF8FA3'], glow: 'rgba(255,107,122,0.45)', accent: '#FF6B7A', textLight: '#FFF5F5', btnBg: 'rgba(255,255,255,0.22)' },
  { id: 'sky',      dot: '#4DA6FF', cardGradient: ['#4DA6FF', '#7EC8FF'], glow: 'rgba(77,166,255,0.45)',  accent: '#4DA6FF', textLight: '#F0F8FF', btnBg: 'rgba(255,255,255,0.22)' },
  { id: 'mint',     dot: '#3ECFA0', cardGradient: ['#3ECFA0', '#6EECC0'], glow: 'rgba(62,207,160,0.45)', accent: '#3ECFA0', textLight: '#F0FFF8', btnBg: 'rgba(255,255,255,0.22)' },
  { id: 'lavender', dot: '#9B7FE8', cardGradient: ['#9B7FE8', '#C4AAFF'], glow: 'rgba(155,127,232,0.45)',accent: '#9B7FE8', textLight: '#F7F4FF', btnBg: 'rgba(255,255,255,0.22)' },
  { id: 'teal',     dot: '#2EC4B6', cardGradient: ['#2EC4B6', '#5EEADC'], glow: 'rgba(46,196,182,0.45)', accent: '#2EC4B6', textLight: '#F0FFFD', btnBg: 'rgba(255,255,255,0.22)' },
];

const getThemeById = (id) => CARD_THEMES.find((t) => t.id === id) || CARD_THEMES[0];

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

// ─── Coin Fly ─────────────────────────────────────────────────────────────────
function CoinFly({ trigger, originX, originY, coinPillRef }) {
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const opacity    = useRef(new RNAnimated.Value(0)).current;
  const scale      = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (!trigger) return;
    translateX.setValue(0);
    translateY.setValue(0);
    opacity.setValue(1);
    scale.setValue(1.4);

    let targetX = SW - 70;
    let targetY = 60;

    const animate = (tx, ty) => {
      RNAnimated.parallel([
        RNAnimated.timing(translateX, { toValue: tx, duration: 750, useNativeDriver: true }),
        RNAnimated.timing(translateY, { toValue: ty, duration: 750, useNativeDriver: true }),
        RNAnimated.sequence([
          RNAnimated.delay(400),
          RNAnimated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
        RNAnimated.timing(scale, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]).start();
    };

    if (coinPillRef?.current) {
      coinPillRef.current.measure((_fx, _fy, _w, _h, px, py) => {
        animate(px - originX, py - originY);
      });
    } else {
      animate(targetX - originX, targetY - originY);
    }
  }, [trigger]);

  if (!trigger) return null;
  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, {
        left: originX, top: originY,
        width: 36, height: 36,
        alignItems: 'center', justifyContent: 'center',
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }]}
    >
      <Text style={{ fontSize: 22 }}>🪙</Text>
    </RNAnimated.View>
  );
}

// ─── Coin Pill ────────────────────────────────────────────────────────────────
const CoinPill = React.forwardRef(({ coins, onHistoryPress }, ref) => (
  <View style={styles.pillRow}>
    <TouchableOpacity onPress={onHistoryPress} style={styles.historyBtn}>
      <Text style={styles.historyIcon}>🕐</Text>
    </TouchableOpacity>
    <View ref={ref} style={styles.coinPill}>
      <Text style={styles.coinPillText}>🪙 {coins}</Text>
    </View>
  </View>
));

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onToggleSubtask, onStartFocus, onDelete, onCoinFly }) {
  const th        = getThemeById(task.themeId);
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const cardRef   = useRef(null);

  const completed = task.subtasks.filter((s) => s.done).length;
  const total     = task.subtasks.length;
  const pct       = total ? Math.round((completed / total) * 100) : 0;

  const pressCard = () => {
    LayoutAnimation.configureNext({
      duration: 320,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.75 },
    });
    RNAnimated.sequence([
      RNAnimated.timing(scaleAnim, { toValue: 0.97, duration: 80,  useNativeDriver: true }),
      RNAnimated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle(task.id);
  };

  const handleSubtask = (subtaskId) => {
    cardRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      onCoinFly({ x: px + 20, y: py + 20 });
    });
    onToggleSubtask(task.id, subtaskId);
  };

  return (
    <RNAnimated.View ref={cardRef} style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.cardGlow, { backgroundColor: th.glow, shadowColor: th.accent }]} />
      <LinearGradient colors={th.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>

        {/* Header */}
        <TouchableOpacity onPress={pressCard} activeOpacity={0.9}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, { color: th.textLight }]} numberOfLines={2}>
                {task.title}
              </Text>
              <Text style={[styles.taskDate, { color: th.textLight, opacity: 0.8 }]}>
                📅 {formatDate(task.dueDate)}
              </Text>
            </View>
            <Text style={[styles.expandChev, { color: th.textLight }]}>
              {task.expanded ? '▲' : '▼'}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: th.textLight }]} />
          </View>
          <Text style={[styles.pctText, { color: th.textLight }]}>
            {completed}/{total} subtasks · {pct}%
          </Text>
        </TouchableOpacity>

        {/* Expanded */}
        {task.expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            <Text style={[styles.timeRange, { color: th.textLight, opacity: 0.75 }]}>
              ⏱ {task.startHour || '09'}:00 – {task.endHour || '11'}:00
            </Text>
            <Text style={[styles.timeRange, { color: th.textLight, opacity: 0.85 }]}>
              ⚡ Priority: {task.priority || 'Medium'}
            </Text>

            {task.subtasks.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                onPress={() => handleSubtask(sub.id)}
                style={styles.subtaskRow}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkCircle,
                  { backgroundColor: sub.done ? th.textLight : 'rgba(255,255,255,0.3)', borderColor: th.textLight },
                ]}>
                  {sub.done && <Text style={{ fontSize: 10 }}>✓</Text>}
                </View>
                <Text style={[
                  styles.subtaskText,
                  { color: th.textLight, textDecorationLine: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.55 : 1 },
                ]}>
                  {sub.title}
                </Text>
                {sub.done && <Text style={styles.coinBadge}>+3🪙</Text>}
              </TouchableOpacity>
            ))}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.focusBtn, { backgroundColor: 'rgba(255,255,255,0.22)' }]}
                onPress={() => onStartFocus(task)}
              >
                <Text style={[styles.focusBtnText, { color: th.textLight }]}>▶ Start Focus</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={() => onDelete(task.id)}
              >
                <Text style={styles.deleteBtnText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </RNAnimated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TasksScreen() {
  const navigation = useNavigation();

  // ── Pull from contexts (no more local useState for data) ──────────────────
  const { tasks, addTask, deleteTask, toggleSubtask, updateTask } = useAppData();
  const { coins, registerSubtaskCompletion, registerTaskCompletion, theme, isDark } = useTheme();

  const addSheetRef  = useRef(null);
  const coinPillRef  = useRef(null);
  const [coinFlies, setCoinFlies] = useState([]);
  const [history,   setHistory]   = useState([]);   // completed tasks shown in History screen

  // Purge history older than 10 days
  useEffect(() => {
    setHistory((prev) => prev.filter((t) => daysSince(t.completedAt) <= 10));
  }, []);

  const fireCoins = useCallback(({ x, y }) => {
    const id = Date.now() + Math.random();
    setCoinFlies((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setCoinFlies((prev) => prev.filter((c) => c.id !== id)), 1200);
  }, []);

  // Toggle expanded state locally inside context
  const toggleExpanded = useCallback((taskId) => {
    updateTask(taskId, (t) => ({ ...t, expanded: !t.expanded }));
  }, [updateTask]);

  const handleToggleSubtask = useCallback((taskId, subtaskId) => {
    toggleSubtask(taskId, subtaskId);
    registerSubtaskCompletion(); // +1 coin via ThemeContext

    // Check if all subtasks now done → move to history
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const willAllBeDone = task.subtasks.every(
      (s) => s.id === subtaskId ? true : s.done
    );
    if (willAllBeDone && !task.completedRewarded) {
      registerTaskCompletion(); // +5 coins bonus
      const completed = { ...task, completedAt: new Date().toISOString(), completedRewarded: true };
      setTimeout(() => {
        setHistory((h) => [completed, ...h]);
        deleteTask(taskId); // removes from AppDataContext → also removes from timeline
      }, 600);
    }
  }, [tasks, toggleSubtask, deleteTask, registerSubtaskCompletion, registerTaskCompletion]);

  const handleDelete = useCallback((taskId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    deleteTask(taskId);
  }, [deleteTask]);

  const handleAddTask = useCallback((taskObj) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    addTask(taskObj); // goes straight into AppDataContext → timeline sees it instantly
  }, [addTask]);

  const startFocus = useCallback((task) => {
    navigation.navigate('Focus', { task });
  }, [navigation]);

  const openHistory = useCallback(() => {
    const parentNav = navigation.getParent?.();
    if (parentNav) parentNav.navigate('TaskHistory', { historyTasks: history });
    else navigation.navigate('TaskHistory', { historyTasks: history });
  }, [navigation, history]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={theme.background} style={StyleSheet.absoluteFill} />

      {/* Flying coins */}
      {coinFlies.map((cf) => (
        <CoinFly key={cf.id} trigger={cf.id} originX={cf.x} originY={cf.y} coinPillRef={coinPillRef} />
      ))}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Tasks</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{tasks.length} active · {history.length} done</Text>
        </View>
        <CoinPill ref={coinPillRef} coins={coins} onHistoryPress={openHistory} />
      </View>

      {/* Task list */}
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={toggleExpanded}
            onToggleSubtask={handleToggleSubtask}
            onStartFocus={startFocus}
            onDelete={handleDelete}
            onCoinFly={fireCoins}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>All done! Add a new task.</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => addSheetRef.current?.expand()} activeOpacity={0.85}>
        <LinearGradient colors={['#818CF8', '#6366F1']} style={styles.fabGradient}>
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <AddTaskBottomSheet ref={addSheetRef} onSubmit={handleAddTask} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: '#64748B', marginTop: 2 },
  pillRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  historyIcon: { fontSize: 18 },
  coinPill:    { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  coinPillText:{ color: '#FDE68A', fontWeight: '700', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  cardWrapper: { marginVertical: 9, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12 },
  cardGlow:    { position: 'absolute', inset: 0, borderRadius: 20, top: -4, left: -4, right: -4, bottom: -4, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 18, elevation: 0 },
  card:        { borderRadius: 20, padding: 18, overflow: 'hidden' },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskTitle:   { fontSize: 17, fontWeight: '700', lineHeight: 22, marginBottom: 4 },
  taskDate:    { fontSize: 13, fontWeight: '500' },
  expandChev:  { fontSize: 13, marginTop: 4, opacity: 0.7 },
  progressTrack:{ height: 5, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  pctText:     { fontSize: 11, marginTop: 5, opacity: 0.75, fontWeight: '600' },
  expandedContent: { marginTop: 10 },
  divider:     { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 10 },
  timeRange:   { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  subtaskRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  subtaskText: { flex: 1, fontSize: 14, fontWeight: '500' },
  coinBadge:   { fontSize: 11, fontWeight: '700', color: '#FDE68A' },
  actionRow:   { flexDirection: 'row', gap: 10, marginTop: 14 },
  focusBtn:    { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  focusBtnText:{ fontWeight: '700', fontSize: 14 },
  deleteBtn:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 20 },
  fab:         { position: 'absolute', bottom: 90, right: 20, borderRadius: 28, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabIcon:     { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  emptyState:  { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:  { fontSize: 48 },
  emptyText:   { color: '#475569', fontSize: 16, fontWeight: '600' },
});
