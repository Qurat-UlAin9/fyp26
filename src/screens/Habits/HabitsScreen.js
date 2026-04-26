import React, { useRef, useState, useEffect } from 'react';
import { Animated as RNAnimated, View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Bell, Check, TrendingUp } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import CoinBalancePill from '../../components/common/CoinBalancePill';
import AddHabitBottomSheet from './AddHabitBottomSheet';

const MOODS = [
  { emoji: '😌', label: 'Calm', color: '#60A5FA' },
  { emoji: '😐', label: 'Steady', color: '#A78BFA' },
  { emoji: '🤩', label: 'Active', color: '#FBBF24' },
  { emoji: '🥱', label: 'Tired', color: '#94A3B8' }
];

function CoinFly({ tick }) {
  const translate = useRef(new RNAnimated.ValueXY({ x: 0, y: 0 })).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!tick) return;
    translate.setValue({ x: 0, y: 0 }); opacity.setValue(1);
    RNAnimated.parallel([
      RNAnimated.timing(translate, { toValue: { x: 130, y: -480 }, duration: 900, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [tick]);
  return (
    <RNAnimated.View pointerEvents="none" style={[styles.coinFx, { opacity, transform: translate.getTranslateTransform() }]}>
      <Text style={styles.coinFxText}>🪙✨</Text>
    </RNAnimated.View>
  );
}

function HabitCard({ habit, onToggle, onDelete, theme }) {
  const doneCount = habit.completions.filter(Boolean).length;
  // Use the habit's theme color for a very light background tint
  const cardBgColor = habit.gradient[0] + '08'; // 5-8% opacity for a soft tint
  const borderColor = habit.gradient[0] + '20'; // 12% opacity for border

  return (
    <Animated.View entering={FadeInDown.duration(500)} layout={LinearTransition} style={[styles.card, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
      <TouchableOpacity onLongPress={() => onDelete(habit.id)} delayLongPress={800} activeOpacity={0.9}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.habitTitle}>{habit.name}</Text>
            <View style={styles.reminderRow}>
              <Bell size={12} color="#64748B" />
              <Text style={styles.reminderText}>{habit.reminder || 'Smart Reminder'}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: habit.gradient[0] + '20' }]}>
            <Text style={[styles.badgeText, { color: habit.gradient[0] }]}>{doneCount}/{habit.timeSlots.length}</Text>
          </View>
        </View>
        <View style={styles.bubblesRow}>
          {habit.timeSlots.map((slot, i) => (
            <View key={i} style={styles.bubbleCol}>
              <Text style={styles.bubbleLabel}>{slot}</Text>
              <TouchableOpacity 
                onPress={() => onToggle(habit.id, i)}
                style={[
                  styles.bubble, 
                  { borderColor: habit.gradient[0] }, 
                  habit.completions[i] && { backgroundColor: habit.gradient[0] }, 
                  i === habit.currentSlotIndex && styles.todayBubble
                ]}
              >
                {habit.completions[i] && <Check size={i === habit.currentSlotIndex ? 22 : 16} color="white" strokeWidth={3} />}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HabitsScreen() {
  const { theme, registerHabitCompletion } = useTheme();
  const { habits, addHabit, toggleHabitSlot, deleteHabit, habitStats } = useAppData();
  const bottomSheetRef = useRef(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [coinFxTick, setCoinFxTick] = useState(0);

  const handleToggle = (id, idx) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    if (!habit.completions[idx]) { setCoinFxTick((t) => t + 1); registerHabitCompletion(); }
    toggleHabitSlot(id, idx);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <CoinFly tick={coinFxTick} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>Habits & Wellbeing</Text>
          <CoinBalancePill />
        </View>
        
        {/* Emotion Section with soft background tint */}
        <View style={styles.feelingSection}>
          <Text style={styles.sectionTitle}>How do you feel today?</Text>
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity key={m.label} onPress={() => setSelectedMood(m.label)} style={styles.moodItem}>
                <View style={[
                  styles.moodCircle, 
                  selectedMood === m.label ? { backgroundColor: m.color } : { backgroundColor: '#F1F5F9' },
                  selectedMood === m.label && styles.moodCircleActive
                ]}>
                  <Text style={[styles.emoji, { opacity: selectedMood === m.label ? 1 : 0.2 }]}>{m.emoji}</Text>
                </View>
                <Text style={[styles.moodLabel, selectedMood === m.label && { color: m.color, fontWeight: '700' }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.habitHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Habits</Text>
          <TrendingUp color="#94A3B8" size={20} />
        </View>
        <Text style={[styles.emptyText, { marginTop: -6, marginBottom: 12 }]}>
          {habitStats.rollingThreeDayDone}/{habitStats.rollingThreeDayTarget} over 3-day target
        </Text>

        {habits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tap the + to start a new habit!</Text>
          </View>
        ) : (
          habits.map(h => (
            <HabitCard 
              key={h.id} 
              habit={h} 
              onToggle={handleToggle} 
              onDelete={deleteHabit} 
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => bottomSheetRef.current?.expand()}>
        <LinearGradient colors={['#4FD1C5', '#2CB1BC']} style={styles.fabGradient}>
          <Plus color="white" size={32} />
        </LinearGradient>
      </TouchableOpacity>
      
      <AddHabitBottomSheet ref={bottomSheetRef} onSubmit={addHabit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  mainTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  
  feelingSection: { 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    borderRadius: 28, 
    marginBottom: 25, 
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.1)', // Very soft purple border
    elevation: 3,
    shadowColor: '#64748B',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 15 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem: { alignItems: 'center', gap: 8 },
  moodCircle: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  moodCircleActive: {
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emoji: { fontSize: 26 },
  moodLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  
  card: { 
    padding: 20, 
    borderRadius: 28, 
    marginBottom: 16, 
    borderWidth: 1.5,
    elevation: 4,
    shadowColor: '#64748B',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  habitTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reminderText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  
  bubblesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  bubbleCol: { alignItems: 'center', gap: 8 },
  bubbleLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  bubble: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  todayBubble: { width: 50, height: 50, borderRadius: 25, borderWidth: 3.5 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: '500' },
  
  coinFx: { position: 'absolute', zIndex: 1000, top: '50%', left: '40%' },
  coinFxText: { fontSize: 32 },
  
  fab: { 
    position: 'absolute', 
    bottom: 120, 
    right: 30, 
    width: 68, 
    height: 68, 
    borderRadius: 34, 
    elevation: 10,
    shadowColor: '#2CB1BC',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabGradient: { flex: 1, borderRadius: 34, justifyContent: 'center', alignItems: 'center' }
});
