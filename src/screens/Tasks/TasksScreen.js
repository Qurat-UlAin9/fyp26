import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import TaskCard from '../../components/tasks/TaskCard';
import AddTaskBottomSheet from '../../components/tasks/AddTaskBottomSheet';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const placeholderTasks = [
  { id: '1', title: 'Focus Time', time: '15 mins', completed: false },
  { id: '2', title: 'Morning Routine', time: '7:00 AM', completed: false },
  // Add more
];

const TasksScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [tasks, setTasks] = React.useState(placeholderTasks);

  const addTask = (newTask) => {
    setTasks([...tasks, { id: Date.now().toString(), title: newTask, time: 'Now', completed: false }]);
  };

  const completeTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Today's Tasks ★</Text>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskCard task={item} onComplete={() => completeTask(item.id)} />}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => { /* Open bottom sheet ref if needed */ }}>
        <Text style={styles.addText}>+ Add Task</Text>
      </TouchableOpacity>
      <AddTaskBottomSheet onAdd={addTask} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  addButton: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#8B5CF6',
    borderRadius: 30,
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
});

export default TasksScreen;