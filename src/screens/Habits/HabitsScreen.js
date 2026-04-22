import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { Plus, Pencil, Trash2, ChevronDown } from 'lucide-react-native';
import { useProductivity } from '../../contexts/ProductivityContext';
import AddHabitBottomSheet from './AddHabitBottomSheet';

const SLOT_LABELS = ['Morning', 'Noon', 'Evening', 'Night'];
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

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <Animated.View style={[styles.bubbleCommon, !done && styles.bubbleOutline, isCurrent && styles.currentBubble, animatedStyle]}>
        {done ? <LinearGradient colors={colors} style={styles.bubbleFill} /> : null}
      </Animated.View>
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
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E0E7FF' }]}><Pencil size={17} color="#4338CA" /></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => onDelete(habit.id)}><Trash2 size={17} color="#DC2626" /></TouchableOpacity>
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
  const { profile, mood, setMood } = useProductivity();
  const [moodOpen, setMoodOpen] = useState(false);
  const [habits, setHabits] = useState([
    { id: '1', name: 'Wake up early', timeSlots: SLOT_LABELS, completions: [true, true, false, false], currentSlotIndex: 2, motivationText: 'Keep going!', gradient: ['#FF9A8B', '#FF6A88'] },
    { id: '2', name: 'Hydration check', timeSlots: SLOT_LABELS, completions: [true, true, true, false], currentSlotIndex: 3, motivationText: 'Almost there!', gradient: ['#5DAEFF', '#3A8DFF'] },
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
        gradient: ['#A78BFA', '#7C3AED'],
      },
    ]);
    bottomSheetRef.current?.close();
  };

  const toggleBubble = (habitId, bubbleIndex) => {
    setHabits((prev) => prev.map((habit) => {
      if (habit.id !== habitId) return habit;
      const updated = [...habit.completions];
      updated[bubbleIndex] = !updated[bubbleIndex];
      return { ...habit, completions: updated };
    }));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Habits & Wellbeing</Text>
        <Text style={styles.welcome}>Hi {profile.firstName}, your mood today: {mood}</Text>

        <TouchableOpacity style={styles.moodTrigger} onPress={() => setMoodOpen(true)}>
          <BlurView intensity={20} tint="light" style={styles.moodTriggerInner}>
            <Text style={styles.moodTriggerText}>How do you feel today?</Text>
            <View style={styles.moodTriggerRight}>
              <Text style={styles.moodSelected}>{mood}</Text>
              <ChevronDown size={16} color="#64748B" />
            </View>
          </BlurView>
        </TouchableOpacity>

        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggleBubble={toggleBubble}
            onDelete={(habitId) => setHabits((prev) => prev.filter((h) => h.id !== habitId))}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => bottomSheetRef.current?.expand()}>
        <BlurView intensity={28} tint="light" style={styles.fabInner}>
          <LinearGradient colors={['#4FD1C5', '#2CB1BC']} style={styles.fabGradient}><Plus color="#FFFFFF" size={24} /></LinearGradient>
        </BlurView>
      </TouchableOpacity>

      <AddHabitBottomSheet ref={bottomSheetRef} onSubmit={addHabit} />

      <Modal visible={moodOpen} transparent animationType="fade" onRequestClose={() => setMoodOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Animated.View entering={FadeInDown.duration(220)} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose your mood</Text>
            {MOODS.map((option) => {
              const active = option.label === mood;
              return (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.moodOption, active && styles.moodOptionActive]}
                  onPress={() => {
                    setMood(option.label);
                    setMoodOpen(false);
                  }}
                >
                  <Text style={styles.moodOptionEmoji}>{option.emoji}</Text>
                  <Text style={[styles.moodOptionLabel, active && styles.moodOptionLabelActive]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120 },
  heading: { fontSize: 30, fontWeight: '800', color: '#111827' },
  welcome: { marginTop: 4, marginBottom: 14, fontSize: 13, color: '#64748B' },
  moodTrigger: { marginBottom: 14, borderRadius: 20, overflow: 'hidden' },
  moodTriggerInner: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodTriggerText: { fontSize: 19, fontWeight: '700', color: '#111827' },
  moodTriggerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moodSelected: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },
  habitCard: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(148,163,184,0.23)', backgroundColor: 'rgba(255,255,255,0.78)', padding: 14, marginBottom: 12, overflow: 'hidden' },
  titleStrip: { height: 4, borderRadius: 8, marginBottom: 10 },
  habitName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  slotCell: { alignItems: 'center', minWidth: 62 },
  slotLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  bubbleCommon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bubbleOutline: { borderWidth: 1.5, borderColor: 'rgba(148,163,184,0.5)', backgroundColor: 'rgba(255,255,255,0.4)' },
  bubbleFill: { width: 24, height: 24, borderRadius: 12 },
  currentBubble: { width: 30, height: 30, borderRadius: 15 },
  motivation: { marginTop: 12, fontSize: 13, color: '#374151', fontWeight: '600' },
  progressText: { marginTop: 4, fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, marginBottom: 12 },
  actionBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  fab: { position: 'absolute', bottom: 28, right: 18, width: 62, height: 62, borderRadius: 31, overflow: 'hidden' },
  fabInner: { flex: 1, padding: 4, borderWidth: 1, borderColor: 'rgba(148,163,184,0.3)', backgroundColor: 'rgba(255,255,255,0.72)' },
  fabGradient: { flex: 1, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.36)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.97)', padding: 16, borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 10 },
  moodOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(148,163,184,0.22)', marginBottom: 8 },
  moodOptionActive: { borderColor: 'rgba(124,58,237,0.45)', backgroundColor: 'rgba(243,232,255,0.8)' },
  moodOptionEmoji: { fontSize: 24, marginRight: 10 },
  moodOptionLabel: { fontSize: 15, fontWeight: '700', color: '#374151' },
  moodOptionLabelActive: { color: '#6D28D9' },
});
