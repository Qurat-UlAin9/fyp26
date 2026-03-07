import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import StreakBar from '../../components/habits/StreakBar';
import AddHabitBottomSheet from '../../components/habits/AddHabitBottomSheet';
import GlassCard from '../../components/common/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const placeholderHabits = [
  { name: 'Meditate', progress: 5/5, icon: 'lotus' },
  // Add more
];

const HabitsScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [habits, setHabits] = React.useState(placeholderHabits);

  const addHabit = (newHabit) => {
    setHabits([...habits, { name: newHabit, progress: 0 }]);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>My Habits 🌿</Text>
      <StreakBar current={5} best={14} />
      <FlatList
        data={habits}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <GlassCard style={styles.habitCard}>
            <Text style={[styles.habitText, { color: themeColors.text }]}>{item.name}</Text>
            <View style={styles.progress}>
              {/* Circular progress placeholder */}
            </View>
          </GlassCard>
        )}
      />
      <AddHabitBottomSheet onAdd={addHabit} />
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
  habitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  habitText: {
    fontSize: 18,
  },
  progress: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HabitsScreen;