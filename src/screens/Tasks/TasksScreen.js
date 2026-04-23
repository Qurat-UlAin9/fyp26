import React, { useRef, useState } from 'react';
import { Animated as RNAnimated, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useProductivity } from '../../contexts/ProductivityContext';
import AddTaskBottomSheet from '../../components/tasks/AddTaskBottomSheet';
import CoinBalancePill from '../../components/common/CoinBalancePill';

function CoinFly({ tick }) {
  const translate = useRef(new RNAnimated.ValueXY({ x: 0, y: 0 })).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    if (!tick) return;
    translate.setValue({ x: 0, y: 0 });
    opacity.setValue(1);
    RNAnimated.parallel([
      RNAnimated.timing(translate, { toValue: { x: 130, y: -440 }, duration: 900, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [tick, opacity, translate]);

  return (
    <RNAnimated.View pointerEvents="none" style={[styles.coinFx, { opacity, transform: [{ translateX: translate.x }, { translateY: translate.y }] }]}>
      <Text style={styles.coinFxText}>🪙✨</Text>
    </RNAnimated.View>
  );
}

function TaskItem({ task, onToggle, onToggleSubtask, onStartFocus, theme, isDark }) {
  const scale = useSharedValue(1);

  const bounce = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressCard = () => {
    scale.value = withSpring(0.97, { damping: 14 }, () => {
      scale.value = withSpring(1);
    });
    onToggle();
  };

  const completed = task.subtasks.filter((s) => s.done).length;
  const pct = task.subtasks.length ? Math.round((completed / task.subtasks.length) * 100) : 0;

  return (
    <Animated.View style={bounce}>
      <TouchableOpacity onPress={pressCard} activeOpacity={0.9} style={styles.taskCard}>
        <LinearGradient colors={isDark ? ['#1E1B4B', '#1E3A8A'] : ['#FFFFFF', '#E0E7FF']} style={styles.taskGradient}>
          <View style={styles.taskTop}>
            <Text style={[styles.taskTitle, { color: isDark ? '#F8FAFC' : theme.text }]}>{task.title}</Text>
            <Text style={[styles.deadline, { color: isDark ? '#CBD5E1' : theme.textSecondary }]}>{task.deadline}</Text>
          </View>
          <Text style={[styles.meta, { color: isDark ? '#CBD5E1' : theme.textSecondary }]}>
            {task.dayKey} • {task.startHour}:00 • {task.duration}h
          </Text>

          {task.expanded && (
            <View style={styles.expandedWrap}>
              {task.subtasks.map((subtask) => (
                <TouchableOpacity key={subtask.id} onPress={() => onToggleSubtask(task.id, subtask.id)} style={styles.subtaskRow}>
                  <View style={[styles.checkCircle, { backgroundColor: subtask.done ? '#22C55E' : '#94A3B8' }]} />
                  <Text style={[styles.subtaskText, { color: isDark ? '#E2E8F0' : theme.text, textDecorationLine: subtask.done ? 'line-through' : 'none' }]}>{subtask.title}</Text>
                </TouchableOpacity>
              ))}
              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.accentGradient[0] }]} />
              </View>
              <TouchableOpacity style={styles.startFocusBtn} onPress={() => onStartFocus(task)}>
                <Text style={styles.startFocusText}>Start Focus Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TasksScreen() {
  const { theme, isDark, registerTaskCompletion, registerSubtaskCompletion } = useTheme();
  const navigation = useNavigation();
  const bottomSheetRef = useRef(null);
  const { tasks, setTasks, addTask, setActiveSessionTask } = useProductivity();
  const [coinFxTick, setCoinFxTick] = useState(0);

  const generateSubtasks = (task) => {
    const base = task.title || 'Task';
    const count = task.workload === 'Low' ? 3 : task.workload === 'Medium' ? 4 : 5;
    return Array.from({ length: count }, (_, i) => ({ id: `${Date.now()}-${i}`, title: `${base}: step ${i + 1}`, done: false }));
  };

  const handleAddTask = (task) => {
    addTask({ ...task, subtasks: generateSubtasks(task), completedRewarded: false });
    bottomSheetRef.current?.close();
  };

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, expanded: !task.expanded } : task)));
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const target = task.subtasks.find((sub) => sub.id === subtaskId);
        if (!target) return task;
        const updatedSubtasks = task.subtasks.map((sub) => (sub.id === subtaskId ? { ...sub, done: !sub.done } : sub));
        const toggledToDone = !target.done;
        if (toggledToDone) {
          registerSubtaskCompletion();
          setCoinFxTick((x) => x + 1);
        }
        const allDone = updatedSubtasks.every((item) => item.done);
        const shouldRewardTask = allDone && !task.completedRewarded;
        if (shouldRewardTask) {
          registerTaskCompletion();
          setCoinFxTick((x) => x + 1);
        }
        return { ...task, subtasks: updatedSubtasks, completedRewarded: shouldRewardTask ? true : task.completedRewarded };
      })
    );
  };

  const startFocusForTask = (task) => {
    setActiveSessionTask(task);
    navigation.navigate('Focus');
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <CoinFly tick={coinFxTick} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headRow}>
          <View>
            <Text style={[styles.header, { color: theme.text }]}>Tasks</Text>
            <Text style={[styles.subHeader, { color: theme.textSecondary }]}>Task +5, subtask +1 coins. Keep building momentum.</Text>
          </View>
          <CoinBalancePill />
        </View>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} onToggleSubtask={toggleSubtask} onStartFocus={startFocusForTask} theme={theme} isDark={isDark} />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => bottomSheetRef.current?.expand()}>
        <LinearGradient colors={theme.accentGradient} style={styles.fabGradient}>
          <Plus color="#FFF" size={28} />
        </LinearGradient>
      </TouchableOpacity>

      <AddTaskBottomSheet ref={bottomSheetRef} onSubmit={handleAddTask} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 100 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  header: { fontSize: 28, fontWeight: '700' },
  subHeader: { marginTop: 4, marginBottom: 14, fontSize: 13, maxWidth: 260 },
  coinFx: { position: 'absolute', right: 34, bottom: 120, zIndex: 30 },
  coinFxText: { fontSize: 24 },
  taskCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  taskGradient: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)' },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  taskTitle: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  deadline: { fontSize: 12, fontWeight: '600' },
  meta: { fontSize: 12 },
  expandedWrap: { marginTop: 12 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkCircle: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  subtaskText: { fontSize: 13 },
  progressTrack: { marginTop: 10, height: 7, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%' },
  startFocusBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#3B82F6' },
  startFocusText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  fab: { position: 'absolute', bottom: 26, right: 18, width: 62, height: 62, borderRadius: 31, overflow: 'hidden' },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
