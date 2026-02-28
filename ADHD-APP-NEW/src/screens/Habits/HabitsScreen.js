import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Flame } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';
import AddHabitBottomSheet from './AddHabitBottomSheet';

export default function HabitsScreen() {
  const { theme } = useTheme();
  const bottomSheetRef = useRef(null);
  const [habits, setHabits] = useState([
    { id: '1', name: 'Morning Meditation', streak: 5, progress: 0.7 },
    { id: '2', name: 'Drink Water', streak: 12, progress: 0.9 },
  ]);

  const addHabit = (habit) => {
    setHabits([...habits, { id: Date.now().toString(), ...habit, streak: 0, progress: 0 }]);
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: theme.text }]}>Habits</Text>
        {habits.map(habit => (
          <GlassCard key={habit.id} style={styles.habitCard}>
            <View style={styles.habitRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.habitName, { color: theme.text }]}>{habit.name}</Text>
                <View style={styles.streakRow}>
                  <Flame color="#FF6B6B" size={16} />
                  <Text style={[styles.streakText, { color: theme.textSecondary }]}>{habit.streak} day streak</Text>
                </View>
              </View>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { width: `${habit.progress * 100}%`, backgroundColor: theme.accentGradient[0] }]} />
                </View>
              </View>
            </View>
          </GlassCard>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => bottomSheetRef.current?.expand()}>
        <LinearGradient colors={theme.accentGradient} style={styles.fabGradient}>
          <Plus color="#FFF" size={28} />
        </LinearGradient>
      </TouchableOpacity>

      <AddHabitBottomSheet ref={bottomSheetRef} onSubmit={addHabit} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  habitCard: { marginBottom: 12, padding: 16 },
  habitRow: { flexDirection: 'row', alignItems: 'center' },
  habitName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakText: { fontSize: 12, marginLeft: 4 },
  progressContainer: { width: 80, marginLeft: 16 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, overflow: 'hidden' },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});