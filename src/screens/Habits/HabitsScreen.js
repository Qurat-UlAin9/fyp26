import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import AddHabitBottomSheet from './AddHabitBottomSheet';
import CoinPill from '../../components/common/CoinPill';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY_INDEX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

function HabitRow({ habit, onToggleBubble }) {
  return (
    <View style={styles.habitRow}>
      <View>
        <Text style={styles.habitName}>{habit.name}</Text>
        <Text style={styles.habitMeta}>{habit.time}</Text>
      </View>
      <View style={styles.bubblesWrap}>
        {Array.from({ length: habit.frequency }).map((_, i) => {
          const filled = i < habit.doneCount;
          return (
            <TouchableOpacity
              key={`${habit.id}-${i}`}
              style={[styles.bubble, !filled && styles.bubbleEmpty]}
              onPress={() => onToggleBubble(habit.id, i)}
            >
              {filled ? <LinearGradient colors={['#A855F7', '#22D3EE']} style={styles.bubbleFill} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function HabitsScreen() {
  const bottomSheetRef = useRef(null);
  const [coins] = useState(182);
  const [selectedMood, setSelectedMood] = useState('🙂');
  const [habits, setHabits] = useState([
    { id: '1', name: 'Medication', frequency: 3, doneCount: 1, time: '08:00', days: [1, 2, 3, 4, 5] },
    { id: '2', name: 'Water Intake', frequency: 5, doneCount: 2, time: '09:00', days: [1, 2, 3, 4, 5, 6, 0] },
    { id: '3', name: 'Stretch Break', frequency: 2, doneCount: 0, time: '18:00', days: [2, 4, 6] },
  ]);

  const todayHabits = useMemo(() => habits.filter((h) => h.days.includes(new Date().getDay())), [habits]);

  const toggleBubble = (id, bubbleIndex) => {
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id !== id) return habit;
        return { ...habit, doneCount: bubbleIndex < habit.doneCount ? bubbleIndex : Math.min(habit.frequency, bubbleIndex + 1) };
      })
    );
  };

  const addHabit = (habit) => {
    setHabits((prev) => [...prev, { id: Date.now().toString(), name: habit.name, frequency: 3, doneCount: 0, time: '12:00', days: [1, 2, 3, 4, 5] }]);
    bottomSheetRef.current?.close();
  };

  return (
    <LinearGradient colors={['#F8FAFF', '#EEF2FF', '#FDF4FF']} style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Habits</Text>
        <CoinPill coins={coins} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTitle}>Weekly Vibes</Text>
          <View style={styles.weekColumns}>
            {DAYS.map((day) => (
              <View key={day} style={styles.weekCol}>
                <View style={styles.emojiSlot}><Text>{day === DAYS[TODAY_INDEX] ? selectedMood : '🙂'}</Text></View>
                <Text style={styles.weekLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.moodCard}>
          <Text style={styles.moodTitle}>How are you feeling today?</Text>
          <View style={styles.moodRow}>
            {['😄', '🙂', '😌', '😵‍💫', '😴'].map((emoji) => (
              <TouchableOpacity key={emoji} onPress={() => setSelectedMood(emoji)} style={[styles.emojiBtn, selectedMood === emoji && styles.emojiSelected]}>
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {todayHabits.map((habit) => (
          <HabitRow key={habit.id} habit={habit} onToggleBubble={toggleBubble} />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => bottomSheetRef.current?.expand()}>
        <LinearGradient colors={['#8B5CF6', '#22D3EE']} style={styles.fabGrad}>
          <Plus color="#FFF" size={22} />
        </LinearGradient>
      </TouchableOpacity>

      <AddHabitBottomSheet ref={bottomSheetRef} onSubmit={addHabit} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 14 },
  headerRow: { paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { fontSize: 29, fontWeight: '800', color: '#0F172A' },
  content: { padding: 18, paddingBottom: 100 },
  weeklyCard: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.8)', padding: 14, marginBottom: 12 },
  weeklyTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  weekColumns: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCol: { alignItems: 'center', width: '13%' },
  emojiSlot: { width: 32, height: 52, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  weekLabel: { fontSize: 11, color: '#64748B', marginTop: 4 },
  moodCard: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.84)', padding: 14, marginBottom: 14 },
  moodTitle: { fontWeight: '800', color: '#1E293B', marginBottom: 10, fontSize: 18 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiBtn: { padding: 7, borderRadius: 18 },
  emojiSelected: { backgroundColor: '#EDE9FE' },
  emoji: { fontSize: 26 },
  habitRow: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  habitMeta: { marginTop: 2, color: '#64748B', fontSize: 12 },
  bubblesWrap: { flexDirection: 'row', gap: 8 },
  bubble: { width: 22, height: 22, borderRadius: 11, overflow: 'hidden' },
  bubbleEmpty: { borderWidth: 1, borderColor: '#CBD5E1' },
  bubbleFill: { flex: 1, borderRadius: 11 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, overflow: 'hidden' },
  fabGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
