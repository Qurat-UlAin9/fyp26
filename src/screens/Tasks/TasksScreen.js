/**
 * TasksScreen.js — ADHD App
 *
 * Features:
 *  - Elevated task cards with glow based on user-selected theme color
 *  - Expand/collapse card animation (LayoutAnimation)
 *  - Subtasks with strikethrough + flying coin animation to coin pill
 *  - 3 coins per subtask, 5 bonus coins when all done
 *  - Completed tasks auto-move to history (disappear after 10 days)
 *  - AddTaskBottomSheet (gorhom): name, due date, notifications toggle, theme picker
 *  - FAB sits above bottom nav — never hidden by the sheet
 *  - Delete button when card is expanded
 *  - Start Focus Session button
 *  - History icon → opens TaskHistoryScreen modal
 *  - Fully scrollable FlatList
 *
 * Companion files:
 *   AddTaskBottomSheet.js  — gorhom bottom-sheet with theme picker
 *   TaskHistoryScreen.js   — completed tasks, 10-day expiry, stats banner
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

// ─── Enable LayoutAnimation on Android ────────────────────────────────────────
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Theme Palette ─────────────────────────────────────────────────────────────
const CARD_THEMES = [
  {
    id: 'coral',
    label: 'Coral',
    dot: '#FF6B7A',
    cardGradient: ['#FF6B7A', '#FF8FA3'],
    glow: 'rgba(255,107,122,0.45)',
    accent: '#FF6B7A',
    textLight: '#FFF5F5',
    textDark: '#7A1A2A',
    btnBg: 'rgba(255,255,255,0.22)',
    checkDone: '#FF6B7A',
    progressFill: '#FF6B7A',
    focusBg: 'rgba(255,107,122,0.18)',
    focusText: '#FFF5F5',
  },
  {
    id: 'sky',
    label: 'Sky',
    dot: '#4DA6FF',
    cardGradient: ['#4DA6FF', '#7EC8FF'],
    glow: 'rgba(77,166,255,0.45)',
    accent: '#4DA6FF',
    textLight: '#F0F8FF',
    textDark: '#0A3560',
    btnBg: 'rgba(255,255,255,0.22)',
    checkDone: '#4DA6FF',
    progressFill: '#4DA6FF',
    focusBg: 'rgba(77,166,255,0.18)',
    focusText: '#F0F8FF',
  },
  {
    id: 'mint',
    label: 'Mint',
    dot: '#3ECFA0',
    cardGradient: ['#3ECFA0', '#6EECC0'],
    glow: 'rgba(62,207,160,0.45)',
    accent: '#3ECFA0',
    textLight: '#F0FFF8',
    textDark: '#0A4030',
    btnBg: 'rgba(255,255,255,0.22)',
    checkDone: '#3ECFA0',
    progressFill: '#3ECFA0',
    focusBg: 'rgba(62,207,160,0.18)',
    focusText: '#F0FFF8',
  },
  {
    id: 'lavender',
    label: 'Lavender',
    dot: '#9B7FE8',
    cardGradient: ['#9B7FE8', '#C4AAFF'],
    glow: 'rgba(155,127,232,0.45)',
    accent: '#9B7FE8',
    textLight: '#F7F4FF',
    textDark: '#2D1060',
    btnBg: 'rgba(255,255,255,0.22)',
    checkDone: '#9B7FE8',
    progressFill: '#9B7FE8',
    focusBg: 'rgba(155,127,232,0.18)',
    focusText: '#F7F4FF',
  },
  {
    id: 'teal',
    label: 'Teal',
    dot: '#2EC4B6',
    cardGradient: ['#2EC4B6', '#5EEADC'],
    glow: 'rgba(46,196,182,0.45)',
    accent: '#2EC4B6',
    textLight: '#F0FFFD',
    textDark: '#083530',
    btnBg: 'rgba(255,255,255,0.22)',
    checkDone: '#2EC4B6',
    progressFill: '#2EC4B6',
    focusBg: 'rgba(46,196,182,0.18)',
    focusText: '#F0FFFD',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getThemeById = (id) => CARD_THEMES.find((t) => t.id === id) || CARD_THEMES[0];
const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const todayISO = () => new Date().toISOString().split('T')[0];
const daysSince = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86400000);
};

// ─── Coin Fly Animation ────────────────────────────────────────────────────────
// coinPillRef: ref whose .measure gives the pill position
function CoinFly({ trigger, originX, originY, coinPillRef }) {
  const translateX = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (!trigger) return;
    // Reset
    translateX.setValue(0);
    translateY.setValue(0);
    opacity.setValue(1);
    scale.setValue(1.4);

    // Measure coin pill to know target
    let targetX = SW - 70;
    let targetY = 60;

    if (coinPillRef?.current) {
      coinPillRef.current.measure((_fx, _fy, _w, _h, px, py) => {
        targetX = px - originX;
        targetY = py - originY;
        animate(targetX, targetY);
      });
    } else {
      animate(targetX - originX, targetY - originY);
    }

    function animate(tx, ty) {
      RNAnimated.parallel([
        RNAnimated.timing(translateX, { toValue: tx, duration: 750, useNativeDriver: true }),
        RNAnimated.timing(translateY, { toValue: ty, duration: 750, useNativeDriver: true }),
        RNAnimated.sequence([
          RNAnimated.delay(400),
          RNAnimated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]),
        RNAnimated.timing(scale, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ]).start();
    }
  }, [trigger]);

  if (!trigger) return null;
  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          left: originX,
          top: originY,
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      <Text style={{ fontSize: 22 }}>🪙</Text>
    </RNAnimated.View>
  );
}

// ─── Coin Pill ─────────────────────────────────────────────────────────────────
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

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onToggleSubtask, onStartFocus, onDelete, onCoinFly }) {
  const th = getThemeById(task.themeId);
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const cardRef = useRef(null);

  const completed = task.subtasks.filter((s) => s.done).length;
  const total = task.subtasks.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const pressCard = () => {
    LayoutAnimation.configureNext({
      duration: 320,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.75 },
    });
    RNAnimated.sequence([
      RNAnimated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      RNAnimated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle(task.id);
  };

  const handleSubtask = (subtaskId) => {
    // measure card to get coin fly origin
    cardRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
      onCoinFly({ x: px + 20, y: py + 20 });
    });
    onToggleSubtask(task.id, subtaskId);
  };

  return (
    <RNAnimated.View
      ref={cardRef}
      style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}
    >
      {/* Glow layer */}
      <View
        style={[
          styles.cardGlow,
          { backgroundColor: th.glow, shadowColor: th.accent },
        ]}
      />
      <LinearGradient
        colors={th.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header row */}
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

          {/* Progress bar (always visible) */}
          <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${pct}%`, backgroundColor: th.textLight },
              ]}
            />
          </View>
          <Text style={[styles.pctText, { color: th.textLight }]}>
            {completed}/{total} subtasks · {pct}%
          </Text>
        </TouchableOpacity>

        {/* Expanded content */}
        {task.expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />

            {/* Time range */}
            <Text style={[styles.timeRange, { color: th.textLight, opacity: 0.75 }]}>
              ⏱ {task.startHour || '09'}:00 – {task.endHour || '11'}:00
            </Text>

            {/* Subtasks */}
            {task.subtasks.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                onPress={() => handleSubtask(sub.id)}
                style={styles.subtaskRow}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: sub.done ? th.textLight : 'rgba(255,255,255,0.3)',
                      borderColor: th.textLight,
                    },
                  ]}
                >
                  {sub.done && <Text style={{ fontSize: 10 }}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.subtaskText,
                    {
                      color: th.textLight,
                      textDecorationLine: sub.done ? 'line-through' : 'none',
                      opacity: sub.done ? 0.55 : 1,
                    },
                  ]}
                >
                  {sub.title}
                </Text>
                {sub.done && (
                  <Text style={styles.coinBadge}>+3🪙</Text>
                )}
              </TouchableOpacity>
            ))}

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.focusBtn, { backgroundColor: 'rgba(255,255,255,0.22)' }]}
                onPress={() => onStartFocus(task)}
              >
                <Text style={[styles.focusBtnText, { color: th.textLight }]}>
                  ▶ Start Focus
                </Text>
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

// HistoryModal and AddTaskSheet are now separate files:
//   → AddTaskBottomSheet.js  (gorhom bottom-sheet)
//   → TaskHistoryScreen.js   (full screen with stats banner)

// ─── Main Tasks Screen ─────────────────────────────────────────────────────────
let _taskIdCounter = 100;
const nextId = () => String(++_taskIdCounter);

const DEMO_TASKS = [
  {
    id: '1',
    title: 'Design onboarding flow',
    dueDate: '2025-08-10',
    themeId: 'sky',
    startHour: '09',
    endHour: '11',
    expanded: false,
    completedRewarded: false,
    completedAt: null,
    subtasks: [
      { id: 's1', title: 'Sketch wireframes', done: false },
      { id: 's2', title: 'Choose color palette', done: false },
      { id: 's3', title: 'Write copy for each screen', done: false },
    ],
  },
  {
    id: '2',
    title: 'Write weekly report',
    dueDate: '2025-08-07',
    themeId: 'mint',
    startHour: '14',
    endHour: '16',
    expanded: false,
    completedRewarded: false,
    completedAt: null,
    subtasks: [
      { id: 's4', title: 'Gather metrics', done: false },
      { id: 's5', title: 'Draft summary', done: false },
    ],
  },
  {
    id: '3',
    title: 'Prepare presentation slides',
    dueDate: '2025-08-12',
    themeId: 'lavender',
    startHour: '10',
    endHour: '12',
    expanded: false,
    completedRewarded: false,
    completedAt: null,
    subtasks: [
      { id: 's6', title: 'Outline key points', done: false },
      { id: 's7', title: 'Add charts', done: false },
      { id: 's8', title: 'Practice delivery', done: false },
    ],
  },
];

export default function TasksScreen() {
  // TasksScreen lives inside TabNavigator which is inside AppNavigator (stack).
  // useNavigation() gives us the tab navigator's navigation object.
  // getParent() climbs up to the root Stack navigator so we can push 'History'.
  const navigation = useNavigation();
  const rootNavigation = navigation.getParent();

  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [history, setHistory] = useState([]);
  const [coins, setCoins] = useState(0);

  // Gorhom bottom sheet ref
  const addSheetRef = useRef(null);

  // Coin fly state: array of { id, x, y }
  const [coinFlies, setCoinFlies] = useState([]);
  const coinPillRef = useRef(null);

  // Filter out tasks completed > 10 days ago
  useEffect(() => {
    setHistory((prev) => prev.filter((t) => daysSince(t.completedAt) <= 10));
  }, []);

  const fireCoins = useCallback(({ x, y }) => {
    const id = Date.now() + Math.random();
    setCoinFlies((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setCoinFlies((prev) => prev.filter((c) => c.id !== id));
    }, 1200);
  }, []);

  const toggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, expanded: !t.expanded } : t))
    );
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks((prev) => {
      return prev
        .map((task) => {
          if (task.id !== taskId) return task;

          const target = task.subtasks.find((s) => s.id === subtaskId);
          if (!target || target.done) return task; // already done, no re-award

          const updatedSubs = task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, done: true } : s
          );

          // +3 coins for subtask
          setCoins((c) => c + 3);

          const allDone = updatedSubs.every((s) => s.done);
          if (allDone && !task.completedRewarded) {
            setCoins((c) => c + 5);
            // Move to history after 600ms
            const completed = { ...task, subtasks: updatedSubs, completedAt: new Date().toISOString(), completedRewarded: true };
            setTimeout(() => {
              setHistory((h) => [completed, ...h]);
              setTasks((prev2) => prev2.filter((t) => t.id !== taskId));
            }, 600);
            return { ...task, subtasks: updatedSubs, completedRewarded: true };
          }

          return { ...task, subtasks: updatedSubs };
        });
    });
  };

  const deleteTask = (taskId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleAddTask = ({ title, dueDate, themeId }) => {
    const newTask = {
      id: nextId(),
      title,
      dueDate,
      themeId,
      startHour: '09',
      endHour: '11',
      expanded: false,
      completedRewarded: false,
      completedAt: null,
      subtasks: [
        { id: nextId() + 'a', title: 'Step 1 (tap to complete)', done: false },
        { id: nextId() + 'b', title: 'Step 2 (tap to complete)', done: false },
        { id: nextId() + 'c', title: 'Step 3 (tap to complete)', done: false },
      ],
    };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setTasks((prev) => [newTask, ...prev]);
  };

  const startFocus = (task) => {
    // Focus is a tab — navigate via the tab navigator
    navigation.navigate('Focus', { task });
  };

  const openHistory = () => {
    // History is registered in the root Stack (AppNavigator), not in tabs.
    // getParent() reaches up from the Tab navigator to the Stack navigator.
    rootNavigation.navigate('History', { historyTasks: history });
  };

  return (
    <View style={styles.screen}>
      {/* BG gradient */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={StyleSheet.absoluteFill}
      />

      {/* Flying coins (rendered over everything) */}
      {coinFlies.map((cf) => (
        <CoinFly
          key={cf.id}
          trigger={cf.id}
          originX={cf.x}
          originY={cf.y}
          coinPillRef={coinPillRef}
        />
      ))}

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>
            {tasks.length} active · {history.length} done
          </Text>
        </View>
        <CoinPill
          ref={coinPillRef}
          coins={coins}
          onHistoryPress={openHistory}
        />
      </View>

      {/* ── Task List ── */}
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={toggleTask}
            onToggleSubtask={toggleSubtask}
            onStartFocus={startFocus}
            onDelete={deleteTask}
            onCoinFly={fireCoins}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={styles.emptyText}>All done! Add a new task.</Text>
          </View>
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => addSheetRef.current?.expand()}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#818CF8', '#6366F1']}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Add Task Bottom Sheet (gorhom) ── */}
      <AddTaskBottomSheet
        ref={addSheetRef}
        onSubmit={handleAddTask}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // Coin pill row
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIcon: { fontSize: 18 },
  coinPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  coinPillText: {
    color: '#FDE68A',
    fontWeight: '700',
    fontSize: 14,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120, // space above FAB + bottom nav
  },

  // Card
  cardWrapper: {
    marginVertical: 9,
    borderRadius: 20,
    // Elevation (shadow) for the "lifted" card effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  cardGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 20,
    // The glow extends beyond the card
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 0,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  taskDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  expandChev: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pctText: {
    fontSize: 11,
    marginTop: 5,
    opacity: 0.75,
    fontWeight: '600',
  },

  // Expanded
  expandedContent: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 10,
  },
  timeRange: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  coinBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE68A',
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  focusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 20 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90, // above bottom tab bar
    right: 20,
    borderRadius: 28,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },

});