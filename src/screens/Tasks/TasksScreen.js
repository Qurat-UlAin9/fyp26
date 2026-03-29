import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import AddTaskBottomSheet from '../../components/tasks/AddTaskBottomSheet';

function TaskItem({ task, onToggle, onToggleSubtask, theme, isDark }) {
  const scale = useSharedValue(1);

  const bounce = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressCard = () => {
    scale.value = withSpring(0.97, { damping: 14 }, () => {
      scale.value = withSpring(1);
    });
    onToggle();
  };

  const completed = task.subtasks.filter((s) => s.done).length;
  const pct = task.subtasks.length ? Math.round((completed / task.subtasks.length) * 100) : 0;
  const isOverdue = new Date(task.deadline) < new Date() && pct < 100;

  return (
    <Animated.View style={bounce}>
      <TouchableOpacity onPress={pressCard} activeOpacity={0.9} style={styles.taskCard}>
        <LinearGradient
          colors={isDark ? ['#1E1B4B', '#1E3A8A'] : ['#FFFFFF', '#E0E7FF']}
          style={styles.taskGradient}
        >
          <View style={styles.taskTop}>
            <Text style={[styles.taskTitle, { color: isDark ? '#F8FAFC' : theme.text }]}>{task.title}</Text>
            <Text style={[styles.deadline, { color: isOverdue ? '#EF4444' : isDark ? '#CBD5E1' : theme.textSecondary }]}>{task.deadline}</Text>
          </View>
          <Text style={[styles.meta, { color: isDark ? '#CBD5E1' : theme.textSecondary }]}>{task.subtasks.length} AI subtasks • {pct}% done</Text>

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
              <Text style={[styles.meta, { color: isDark ? '#CBD5E1' : theme.textSecondary }]}>Progress: {completed}/{task.subtasks.length}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TasksScreen() {
  const { theme, isDark } = useTheme();
  const bottomSheetRef = useRef(null);
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Complete assignment draft',
      deadline: '2026-03-12',
      expanded: false,
      subtasks: [
        { id: '1-1', title: 'Create outline', done: true },
        { id: '1-2', title: 'Write intro', done: false },
        { id: '1-3', title: 'Add references', done: false },
      ],
    },
    {
      id: '2',
      title: 'Prepare presentation',
      deadline: '2026-03-10',
      expanded: false,
      subtasks: [
        { id: '2-1', title: 'Gather slides', done: true },
        { id: '2-2', title: 'Add speaker notes', done: true },
        { id: '2-3', title: 'Practice once', done: false },
      ],
    },
  ]);

  const generateSubtasks = (task) => {
    const base = task.title || 'Task';
    const count = task.workload === 'Low' ? 3 : task.workload === 'Medium' ? 4 : 5;
    return Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      title: `${base}: step ${i + 1}`,
      done: false,
    }));
  };

  const handleAddTask = (task) => {
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: task.title,
        deadline: task.deadline,
        expanded: false,
        subtasks: generateSubtasks(task),
      },
    ]);
    bottomSheetRef.current?.close();
  };

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, expanded: !task.expanded } : task)));
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((sub) => (sub.id === subtaskId ? { ...sub, done: !sub.done } : sub)),
            }
          : task
      )
    );
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: theme.text }]}>Tasks</Text>
        <Text style={[styles.subHeader, { color: theme.textSecondary }]}>Tap a card to expand AI subtasks and progress.</Text>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task.id)}
            onToggleSubtask={toggleSubtask}
            theme={theme}
            isDark={isDark}
          />
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
  header: { fontSize: 28, fontWeight: '700' },
  subHeader: { marginTop: 4, marginBottom: 14, fontSize: 13 },
  taskCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  taskGradient: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
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
  fab: {
    position: 'absolute',
    bottom: 26,
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
  },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
