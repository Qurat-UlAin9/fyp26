import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';
import TaskCard from '../../components/tasks/TaskCard';
import AddTaskBottomSheet from '../../components/tasks/AddTaskBottomSheet';

export default function TasksScreen() {
  const { theme } = useTheme();
  const bottomSheetRef = useRef(null);
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Complete project report', deadline: '2025-03-10', workload: 'High', expanded: false, subtasks: ['Draft outline', 'Write introduction', 'Review'] },
    { id: '2', title: 'Buy groceries', deadline: '2025-03-09', workload: 'Low', expanded: false, subtasks: ['Milk', 'Bread', 'Eggs'] },
  ]);

  const handleAddTask = (newTask) => {
    setTasks([...tasks, { id: Date.now().toString(), ...newTask, expanded: false, subtasks: generateSubtasks(newTask) }]);
    bottomSheetRef.current?.close();
  };

  // Dummy AI breakdown
  const generateSubtasks = (task) => {
    const count = task.workload === 'Low' ? 2 : task.workload === 'Medium' ? 4 : 6;
    return Array.from({ length: count }, (_, i) => `Step ${i + 1}`);
  };

  const toggleExpand = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t));
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: theme.text }]}>My Tasks</Text>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onToggle={() => toggleExpand(task.id)} />
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
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});