import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Plus, Pencil, Trash2 } from 'lucide-react-native';
import AddHabitBottomSheet from './AddHabitBottomSheet';

const SLOT_LABELS = ['Morning', 'Noon', 'Evening', 'Night'];

const GRADIENTS = {
  orange: ['#FF9A8B', '#FF6A88'],
  blue: ['#5DAEFF', '#3A8DFF'],
  green: ['#6EE7B7', '#34D399'],
  purple: ['#A78BFA', '#7C3AED'],
  yellow: ['#FFD166', '#FCA311'],
  teal: ['#4FD1C5', '#2CB1BC'],
  pink: ['#FF7EB3', '#FF4D6D'],
};

const MOODS = [
  { emoji: '😌', label: 'Calm' },
  { emoji: '🙂', label: 'Steady' },
  { emoji: '🤩', label: 'Motivated' },
  { emoji: '😮‍💨', label: 'Tired' },
];

function HabitBubble({ done, isCurrent, onPress, colors }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(1.16, { damping: 11 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  if (done) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <Animated.View style={[styles.bubbleCommon, isCurrent && styles.currentBubble, animatedStyle]}>
          <LinearGradient colors={colors} style={styles.bubbleFill} />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <Animated.View style={[styles.bubbleCommon, styles.bubbleOutline, isCurrent && styles.currentBubble, animatedStyle]} />
    </TouchableOpacity>
  );
}

function HabitCard({ habit, onToggleBubble, onDelete }) {
  const totalDone = habit.completions.filter(Boolean).length;

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.swipeActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E0E7FF' }]}>
            <Pencil size={17} color="#4338CA" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => onDelete(habit.id)}>
            <Trash2 size={17} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}
    >
      <BlurView intensity={24} tint="light" style={styles.habitCard}>
        <LinearGradient colors={habit.gradient} style={styles.titleStrip} />
        <Text style={styles.habitName}>{habit.name}</Text>

        <View style={styles.slotRow}>
          {habit.timeSlots.map((slot, index) => (
            <View key={`${habit.id}-${slot}`} style={styles.slotCell}>
              <Text style={styles.slotLabel}>{slot}</Text>
              <HabitBubble
                done={habit.completions[index]}
                isCurrent={index === habit.currentSlotIndex}
                onPress={() => onToggleBubble(habit.id, index)}
                colors={habit.gradient}
              />
            </View>
          ))}
        </View>

        <Text style={styles.motivation}>{habit.motivationText}</Text>
        <Text style={styles.progressText}>{totalDone}/{habit.timeSlots.length} done today</Text>
      </BlurView>
    </Swipeable>
  );
}

export default function HabitsScreen() {
  const bottomSheetRef = useRef(null);
  const [selectedMood, setSelectedMood] = useState('Steady');
  const [habits, setHabits] = useState([
    {
      id: '1',
      name: 'Wake up early',
      timeSlots: SLOT_LABELS,
      completions: [true, true, false, false],
      currentSlotIndex: 2,
      motivationText: 'Keep going!',
      gradient: GRADIENTS.orange,
    },
    {
      id: '2',
      name: 'Hydration check',
      timeSlots: SLOT_LABELS,
      completions: [true, true, true, false],
      currentSlotIndex: 3,
      motivationText: 'Almost there!',
      gradient: GRADIENTS.blue,
    },
    {
      id: '3',
      name: '10 minute tidy',
      timeSlots: SLOT_LABELS,
      completions: [false, false, true, false],
      currentSlotIndex: 1,
      motivationText: "You're doing great!",
      gradient: GRADIENTS.green,
    },
  ]);

  const addHabit = (newHabit) => {
    const slots = (newHabit.timeSlots?.length ? newHabit.timeSlots : SLOT_LABELS).slice(0, newHabit.repeatCount);
    setHabits((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newHabit.name,
        timeSlots: slots,
        completions: slots.map(() => false),
        currentSlotIndex: 0,
        motivationText: 'New habit unlocked ✨',
        gradient: GRADIENTS.purple,
      },
    ]);
    bottomSheetRef.current?.close();
  };

  const toggleBubble = (habitId, bubbleIndex) => {
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        const updated = [...habit.completions];
        updated[bubbleIndex] = !updated[bubbleIndex];
        return { ...habit, completions: updated };
      })
    );
  };

  const deleteHabit = (habitId) => {
    setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Habits & Wellbeing</Text>

        <BlurView intensity={24} tint="light" style={styles.moodCard}>
          <Text style={styles.moodTitle}>How do you feel today?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((mood) => {
              const active = selectedMood === mood.label;
              return (
                <TouchableOpacity key={mood.label} onPress={() => setSelectedMood(mood.label)} style={styles.moodButton}>
                  <View style={[styles.moodGlow, active && styles.moodGlowActive]}>
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  </View>
                  <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>{mood.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>

        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} onToggleBubble={toggleBubble} onDelete={deleteHabit} />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => bottomSheetRef.current?.expand()}>
        <BlurView intensity={30} tint="light" style={styles.fabInner}>
          <LinearGradient colors={GRADIENTS.teal} style={styles.fabGradient}>
            <Plus color="#FFFFFF" size={24} />
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>

      <AddHabitBottomSheet ref={bottomSheetRef} onSubmit={addHabit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120 },
  heading: { fontSize: 30, fontWeight: '800', color: '#111827', marginBottom: 14 },
  moodCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  moodTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: { alignItems: 'center', width: '24%' },
  moodGlow: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  moodGlowActive: {
    borderColor: 'rgba(79,70,229,0.5)',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: { marginTop: 6, fontSize: 12, color: '#6B7280', fontWeight: '600' },
  moodLabelActive: { color: '#4F46E5' },
  habitCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.23)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    padding: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  titleStrip: {
    height: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  habitName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  slotCell: { alignItems: 'center', minWidth: 62 },
  slotLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  bubbleCommon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleOutline: {
    borderWidth: 1.5,
    borderColor: 'rgba(148,163,184,0.5)',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bubbleFill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  currentBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  motivation: { marginTop: 12, fontSize: 13, color: '#374151', fontWeight: '600' },
  progressText: { marginTop: 4, fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, marginBottom: 12 },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
  },
  fabInner: {
    flex: 1,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  fabGradient: {
    flex: 1,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2CB1BC',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
