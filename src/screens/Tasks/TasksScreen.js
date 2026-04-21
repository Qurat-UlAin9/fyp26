import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import AddTaskBottomSheet from '../../components/tasks/AddTaskBottomSheet';
import CoinPill from '../../components/common/CoinPill';

function CoinBurst({ count }) {
  const coins = Array.from({ length: count }, (_, i) => i);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {coins.map((idx) => (
        <AnimatedCoin key={idx} idx={idx} />
      ))}
    </View>
  );
}

function AnimatedCoin({ idx }) {
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming(1, { duration: 900 + idx * 90 });
  }, [idx, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: (90 + idx * 8) * progress.value },
      { translateY: -140 * progress.value + idx * 3 },
      { scale: 1 - 0.25 * progress.value },
    ],
  }));

  return <Animated.View style={[styles.coin, style]} />;
}

function TaskItem({ task, onToggle, onToggleSubtask, onToggleTask, burstCount }) {
  const expandedHeight = useSharedValue(task.expanded ? 1 : 0);

  React.useEffect(() => {
    expandedHeight.value = withSpring(task.expanded ? 1 : 0, { damping: 16 });
  }, [expandedHeight, task.expanded]);

  const accordionStyle = useAnimatedStyle(() => ({
    maxHeight: withTiming(task.expanded ? 220 : 0, { duration: 280 }),
    opacity: expandedHeight.value,
  }));

  const allDone = task.subtasks.every((s) => s.done);

  return (
    <Animated.View entering={FadeInDown.duration(380)} style={styles.cardWrap}>
      <TouchableOpacity activeOpacity={0.9} onPress={onToggle}>
        <LinearGradient colors={allDone ? ['#CFFDE4', '#99F6E4'] : ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.86)']} style={styles.taskCard}>
          <View style={styles.headRow}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <TouchableOpacity onPress={onToggleTask} style={[styles.mainCheck, allDone && styles.mainCheckDone]} />
          </View>
          <Text style={styles.deadline}>Due {task.deadline}</Text>

          <Animated.View style={[styles.expandedWrap, accordionStyle]}>
            {task.expanded && (
              <>
                {task.subtasks.map((subtask) => (
                  <TouchableOpacity key={subtask.id} style={styles.subtaskRow} onPress={() => onToggleSubtask(task.id, subtask.id)}>
                    <View style={styles.thread} />
                    <View style={[styles.checkbox, subtask.done && styles.checkboxDone]} />
                    <Text style={[styles.subtaskText, subtask.done && styles.subtaskDone]}>{subtask.title}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity activeOpacity={0.85}>
                  <LinearGradient colors={['#818CF8', '#22D3EE']} style={styles.focusBtn}>
                    <Text style={styles.focusText}>Start Focus</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
          {!!burstCount && <CoinBurst count={burstCount} />}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TasksScreen() {
  const bottomSheetRef = useRef(null);
  const [coins, setCoins] = useState(182);
  const [burstByTask, setBurstByTask] = useState({});
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Prepare presentation',
      deadline: '2026-04-24',
      expanded: false,
      subtasks: [
        { id: '1-1', title: 'Gather slides', done: false },
        { id: '1-2', title: 'Add speaker notes', done: false },
        { id: '1-3', title: 'Practice once', done: false },
      ],
    },
  ]);

  const toggleTask = (id) => setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, expanded: !task.expanded } : task)));

  const spawnBurst = (taskId, count) => {
    setBurstByTask((prev) => ({ ...prev, [taskId]: count }));
    setTimeout(() => setBurstByTask((prev) => ({ ...prev, [taskId]: 0 })), 920);
  };

  const toggleMainTask = (taskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, subtasks: task.subtasks.map((s) => ({ ...s, done: true })) } : task
      )
    );
    setCoins((c) => c + 5);
    spawnBurst(taskId, 5);
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
            }
          : task
      )
    );
    setCoins((c) => c + 1);
    spawnBurst(taskId, 3);
  };

  const handleAddTask = (task) => {
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: task.title,
        deadline: task.deadline || '2026-04-30',
        expanded: false,
        subtasks: [
          { id: 'n-1', title: 'Break task into chunks', done: false },
          { id: 'n-2', title: 'Start first draft', done: false },
          { id: 'n-3', title: 'Review and polish', done: false },
        ],
      },
    ]);
    bottomSheetRef.current?.close();
  };

  return (
    <LinearGradient colors={['#F8FAFF', '#EEF2FF', '#ECFEFF']} style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tasks</Text>
        <CoinPill coins={coins} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task.id)}
            onToggleSubtask={toggleSubtask}
            onToggleTask={() => toggleMainTask(task.id)}
            burstCount={burstByTask[task.id]}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => bottomSheetRef.current?.expand()}>
        <LinearGradient colors={['#6366F1', '#22D3EE']} style={styles.fabGrad}>
          <Plus color="#FFF" size={22} />
        </LinearGradient>
      </TouchableOpacity>

      <AddTaskBottomSheet ref={bottomSheetRef} onSubmit={handleAddTask} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 14 },
  headerRow: { paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 29, fontWeight: '800', color: '#0F172A' },
  content: { padding: 18, paddingBottom: 100 },
  cardWrap: { marginBottom: 12 },
  taskCard: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', flex: 1 },
  deadline: { fontSize: 12, color: '#64748B', marginTop: 2 },
  mainCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#94A3B8' },
  mainCheckDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  expandedWrap: { marginTop: 10, overflow: 'hidden' },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingLeft: 10 },
  thread: { position: 'absolute', left: 13, top: 0, bottom: 0, width: 1, backgroundColor: '#CBD5E1' },
  checkbox: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#64748B', backgroundColor: '#FFF', marginRight: 10 },
  checkboxDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  subtaskText: { color: '#334155', fontWeight: '600' },
  subtaskDone: { textDecorationLine: 'line-through', color: '#64748B' },
  focusBtn: { marginTop: 8, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  focusText: { color: '#FFF', fontWeight: '800' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, overflow: 'hidden' },
  fabGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coin: {
    position: 'absolute',
    right: 24,
    bottom: 22,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FACC15',
    borderWidth: 1,
    borderColor: '#EAB308',
  },
});
