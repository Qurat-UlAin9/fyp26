import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Flame } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import AddHabitBottomSheet from './AddHabitBottomSheet';

function HabitCard({ habit, onToggle, theme, isDark }) {
  const flameScale = useSharedValue(1);

  React.useEffect(() => {
    if (habit.completedToday) {
      flameScale.value = withRepeat(withTiming(1.18, { duration: 500 }), 4, true);
    } else {
      flameScale.value = withTiming(1, { duration: 200 });
    }
  }, [habit.completedToday, flameScale]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  return (
    <View style={[styles.habitCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
      <View style={styles.habitTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.habitName, { color: theme.text }]}>{habit.name}</Text>
          <View style={styles.streakRow}>
            <Animated.View style={flameStyle}>
              <Flame color="#F97316" size={16} />
            </Animated.View>
            <Text style={[styles.streakText, { color: theme.textSecondary }]}>{habit.streak} day streak</Text>
          </View>
        </View>

        <TouchableOpacity onPress={onToggle} style={[styles.toggleBtn, { backgroundColor: habit.completedToday ? '#22C55E' : '#64748B' }]}>
          <Text style={styles.toggleText}>{habit.completedToday ? 'Done' : 'Mark'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.weeklyTrack, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={[styles.weeklyFill, { width: `${habit.weeklyProgress * 100}%`, backgroundColor: theme.accentGradient[0] }]} />
      </View>
      <Text style={[styles.weeklyLabel, { color: theme.textSecondary }]}>Weekly progress {Math.round(habit.weeklyProgress * 100)}%</Text>
    </View>
  );
}

export default function HabitsScreen() {
  const { theme, isDark } = useTheme();
  const bottomSheetRef = useRef(null);
  const [habits, setHabits] = useState([
    { id: '1', name: 'Morning hydration', streak: 5, weeklyProgress: 0.72, completedToday: false },
    { id: '2', name: '10-min tidy up', streak: 8, weeklyProgress: 0.84, completedToday: true },
    { id: '3', name: 'Evening reflection', streak: 3, weeklyProgress: 0.45, completedToday: false },
  ]);

  const addHabit = (habit) => {
    setHabits((prev) => [
      ...prev,
      { id: Date.now().toString(), name: habit.name, streak: 0, weeklyProgress: 0.1, completedToday: false },
    ]);
  };

  const toggleHabit = (id) => {
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id !== id) return habit;
        const completed = !habit.completedToday;
        return {
          ...habit,
          completedToday: completed,
          streak: completed ? habit.streak + 1 : Math.max(0, habit.streak - 1),
          weeklyProgress: Math.min(1, Math.max(0, habit.weeklyProgress + (completed ? 0.12 : -0.12))),
        };
      })
    );
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: theme.text }]}>Habits</Text>
        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id)} theme={theme} isDark={isDark} />
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
  scrollContent: { padding: 18, paddingBottom: 100 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  habitCard: {
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  habitTop: { flexDirection: 'row', alignItems: 'center' },
  habitName: { fontSize: 16, fontWeight: '700' },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  streakText: { marginLeft: 5, fontSize: 13 },
  toggleBtn: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  toggleText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  weeklyTrack: { marginTop: 12, height: 8, borderRadius: 99, overflow: 'hidden' },
  weeklyFill: { height: '100%', borderRadius: 99 },
  weeklyLabel: { marginTop: 7, fontSize: 12 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
  },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
