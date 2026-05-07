/**
 * HabitsScreen.js — updated
 * Changes:
 *  1. habits/addHabit/toggleHabitSlot/deleteHabit now come from useAppData()
 *  2. Mood section has a gradient background instead of plain white
 *  3. Habit card: top half uses the user's chosen gradient color,
 *     bottom half keeps the current soft tinted look
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Animated as RNAnimated,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Bell, Check, TrendingUp } from 'lucide-react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';   // ← NEW
import CoinBalancePill from '../../components/common/CoinBalancePill';
import AddHabitBottomSheet from './AddHabitBottomSheet';

// ─── Mood data ─────────────────────────────────────────────────────────────────
const MOODS = [
  { emoji: '😌', label: 'Calm',   color: '#60A5FA', bg: ['#DBEAFE', '#EFF6FF'] },
  { emoji: '😐', label: 'Steady', color: '#A78BFA', bg: ['#EDE9FE', '#F5F3FF'] },
  { emoji: '🤩', label: 'Active', color: '#FBBF24', bg: ['#FEF3C7', '#FFFBEB'] },
  { emoji: '🥱', label: 'Tired',  color: '#94A3B8', bg: ['#F1F5F9', '#F8FAFC'] },
];

// ─── Coin fly animation ────────────────────────────────────────────────────────
function CoinFly({ tick }) {
  const translate = useRef(new RNAnimated.ValueXY({ x: 0, y: 0 })).current;
  const opacity   = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!tick) return;
    translate.setValue({ x: 0, y: 0 });
    opacity.setValue(1);
    RNAnimated.parallel([
      RNAnimated.timing(translate, { toValue: { x: 130, y: -480 }, duration: 900, useNativeDriver: true }),
      RNAnimated.timing(opacity,   { toValue: 0, duration: 900, useNativeDriver: true }),
    ]).start();
  }, [tick]);
  return (
    <RNAnimated.View
      pointerEvents="none"
      style={[styles.coinFx, { opacity, transform: translate.getTranslateTransform() }]}
    >
      <Text style={styles.coinFxText}>🪙✨</Text>
    </RNAnimated.View>
  );
}

// ─── Habit Card ────────────────────────────────────────────────────────────────
// Top section: gradient background using the user's chosen color
// Bottom section: soft tint (original style)
function HabitCard({ habit, onToggle, onDelete }) {
  const doneCount = habit.completions.filter(Boolean).length;

  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      layout={LinearTransition}
      style={styles.card}
    >
      <TouchableOpacity
        onLongPress={() => onDelete(habit.id)}
        delayLongPress={800}
        activeOpacity={0.95}
      >
        {/* ── Top half: gradient header ── */}
        <LinearGradient
          colors={habit.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardTop}
        >
          <View style={styles.cardTopInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.habitTitle}>{habit.name}</Text>
              <View style={styles.reminderRow}>
                <Bell size={12} color="rgba(255,255,255,0.75)" />
                <Text style={styles.reminderText}>{habit.reminder || 'Smart Reminder'}</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{doneCount}/{habit.timeSlots.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Bottom half: completion bubbles ── */}
        <View
          style={[
            styles.cardBottom,
            { backgroundColor: habit.gradient[0] + '10', borderColor: habit.gradient[0] + '25' },
          ]}
        >
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
                  ]}
                >
                  {habit.completions[i] && (
                    <Check size={16} color="white" strokeWidth={3} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function HabitsScreen() {
  const { registerHabitCompletion } = useTheme();

  // ── Pull from AppDataContext instead of local useState ──────────────────────
  const { habits, addHabit, toggleHabitSlot, deleteHabit } = useAppData();

  const bottomSheetRef  = useRef(null);
  const [selectedMood,  setSelectedMood]  = useState(null);
  const [coinFxTick,    setCoinFxTick]    = useState(0);

  const handleToggle = (id, idx) => {
    const habit = habits.find((h) => h.id === id);
    if (habit && !habit.completions[idx]) {
      setCoinFxTick((t) => t + 1);
      registerHabitCompletion();
    }
    toggleHabitSlot(id, idx);          // updates AppDataContext → timeline updates too
  };

  const activeMood = MOODS.find((m) => m.label === selectedMood);

  return (
    <SafeAreaView style={styles.container}>
      <CoinFly tick={coinFxTick} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.mainTitle}>Habits & Wellbeing</Text>
          <CoinBalancePill />
        </View>

        {/* ── Mood section — gradient background ── */}
        <LinearGradient
          colors={activeMood ? activeMood.bg : ['#F0F9FF', '#E0F2FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.feelingSection}
        >
          <Text style={[styles.sectionTitle, activeMood && { color: activeMood.color }]}>
            How do you feel today?
          </Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => {
              const selected = selectedMood === m.label;
              return (
                <TouchableOpacity
                  key={m.label}
                  onPress={() => setSelectedMood(selected ? null : m.label)}
                  style={styles.moodItem}
                >
                  <View
                    style={[
                      styles.moodCircle,
                      selected
                        ? { backgroundColor: m.color, shadowColor: m.color }
                        : { backgroundColor: 'rgba(255,255,255,0.6)' },
                      selected && styles.moodCircleActive,
                    ]}
                  >
                    <Text style={[styles.emoji, { opacity: selected ? 1 : 0.5 }]}>
                      {m.emoji}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.moodLabel,
                      selected && { color: m.color, fontWeight: '700' },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        {/* Habits header */}
        <View style={styles.habitHeader}>
          <Text style={styles.sectionTitle}>Daily Habits</Text>
          <TrendingUp color="#94A3B8" size={20} />
        </View>

        {/* Habit cards */}
        {habits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>Tap + to start a new habit!</Text>
          </View>
        ) : (
          habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              onToggle={handleToggle}
              onDelete={deleteHabit}
            />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => bottomSheetRef.current?.expand()}
      >
        <LinearGradient colors={['#4FD1C5', '#2CB1BC']} style={styles.fabGradient}>
          <Plus color="white" size={32} />
        </LinearGradient>
      </TouchableOpacity>

      {/* AddHabitBottomSheet — onSubmit goes directly to AppDataContext */}
      <AddHabitBottomSheet
        ref={bottomSheetRef}
        onSubmit={addHabit}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F0F4F8' },
  scrollContent: { padding: 20, paddingBottom: 120 },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mainTitle:  { fontSize: 28, fontWeight: '800', color: '#1E293B' },

  // Mood section
  feelingSection: {
    padding: 20,
    borderRadius: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    elevation: 3,
    shadowColor: '#64748B',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionTitle:  { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 15 },
  moodRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  moodItem:      { alignItems: 'center', gap: 8 },
  moodCircle:    { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  moodCircleActive: { elevation: 6, shadowOpacity: 0.3, shadowRadius: 8 },
  emoji:         { fontSize: 26 },
  moodLabel:     { fontSize: 12, color: '#64748B', marginTop: 4 },

  // Habit list
  habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },

  // Habit card — outer wrapper
  card: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#64748B',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  // Card top — gradient header
  cardTop:      { paddingHorizontal: 18, paddingVertical: 16 },
  cardTopInner: { flexDirection: 'row', alignItems: 'center' },
  habitTitle:   { fontSize: 20, fontWeight: '700', color: '#fff' },
  reminderRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reminderText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Card bottom — bubbles
  cardBottom:  { paddingHorizontal: 18, paddingVertical: 16, borderWidth: 1, borderTopWidth: 0 },
  bubblesRow:  { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  bubbleCol:   { alignItems: 'center', gap: 8 },
  bubbleLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  // Empty state
  emptyContainer: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyEmoji:     { fontSize: 40 },
  emptyText:      { color: '#94A3B8', fontSize: 16, fontWeight: '500' },

  // Coin FX
  coinFx:     { position: 'absolute', zIndex: 1000, top: '50%', left: '40%' },
  coinFxText: { fontSize: 32 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 68,
    height: 68,
    borderRadius: 34,
    elevation: 10,
    shadowColor: '#2CB1BC',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabGradient: { flex: 1, borderRadius: 34, justifyContent: 'center', alignItems: 'center' },
});