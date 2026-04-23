import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

const WEEK_DAYS = [
  { key: 'Sun', date: 14 },
  { key: 'Mon', date: 15 },
  { key: 'Tue', date: 16 },
  { key: 'Wed', date: 17 },
  { key: 'Thu', date: 18 },
  { key: 'Fri', date: 19 },
  { key: 'Sat', date: 20 },
];

const GRADIENTS = {
  orange: ['#FF9A8B', '#FF6A88'],
  blue: ['#5DAEFF', '#3A8DFF'],
  green: ['#6EE7B7', '#34D399'],
  purple: ['#A78BFA', '#7C3AED'],
  yellow: ['#FFD166', '#FCA311'],
  teal: ['#4FD1C5', '#2CB1BC'],
  pink: ['#FF7EB3', '#FF4D6D'],
};

const TIMELINE_TASKS = [
  { id: '1', title: 'Morning Plan', day: 1, startHour: 8, duration: 1, gradient: GRADIENTS.orange },
  { id: '2', title: 'Deep Work', day: 2, startHour: 10, duration: 2, gradient: GRADIENTS.blue },
  { id: '3', title: 'Lunch Walk', day: 3, startHour: 12, duration: 1, gradient: GRADIENTS.green },
  { id: '4', title: 'Therapy Notes', day: 4, startHour: 14, duration: 1, gradient: GRADIENTS.purple },
  { id: '5', title: 'Study Sprint', day: 5, startHour: 15, duration: 2, gradient: GRADIENTS.teal },
  { id: '6', title: 'Gym Reset', day: 6, startHour: 18, duration: 1, gradient: GRADIENTS.pink },
  { id: '7', title: 'Read + Journal', day: 0, startHour: 20, duration: 1, gradient: GRADIENTS.yellow },
];

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 62;
const LABEL_WIDTH = 58;

const formatHour = (hour) => {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const base = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${base} ${suffix}`;
};

export default function TimelineScreen() {
  const { theme } = useTheme();
  const [selectedDay, setSelectedDay] = useState('Mon');

  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, idx) => START_HOUR + idx), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Focus Timeline</Text>

        <BlurView intensity={25} tint={theme.mode} style={[styles.headerCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day) => (
              <TouchableOpacity
                key={day.key}
                style={[styles.dayPill, selectedDay === day.key && styles.dayPillActive]}
                onPress={() => setSelectedDay(day.key)}
              >
                <Text style={[styles.dayText, selectedDay === day.key && styles.dayTextActive]}>{day.key}</Text>
                <Text style={[styles.dayDate, selectedDay === day.key && styles.dayTextActive]}>{day.date}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.monthBtn}>
              <Text style={styles.monthBtnText}>May 2023 ▾</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        <View style={[styles.timelineCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <ScrollView nestedScrollEnabled style={styles.timelineScroll} showsVerticalScrollIndicator={false}>
            <View style={{ height: hours.length * HOUR_HEIGHT }}>
              {hours.map((hour, index) => (
                <View key={hour} style={[styles.hourRow, { top: index * HOUR_HEIGHT }]}>
                  <Text style={styles.hourText}>{formatHour(hour)}</Text>
                  <View style={styles.hourLine} />
                </View>
              ))}

              {TIMELINE_TASKS.map((task) => {
                const top = (task.startHour - START_HOUR) * HOUR_HEIGHT + 6;
                const height = task.duration * HOUR_HEIGHT - 10;
                const dayWidth = (100 - LABEL_WIDTH / 3.3) / 7;
                const left = LABEL_WIDTH + dayWidth * task.day + 4;
                return (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => {}}
                    onLongPress={() => {}}
                    activeOpacity={0.86}
                    style={[styles.taskContainer, { top, left, height, width: dayWidth - 8 }]}
                  >
                    <LinearGradient colors={task.gradient} style={styles.taskCard}>
                      <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                      <Text style={styles.taskDuration}>{formatHour(task.startHour)} · {task.duration}h</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.focusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.focusTitle}>Focus</Text>
          <Text style={styles.focusEmpty}>Start a task to begin your focus journey ✨</Text>
        </View>

        <View style={styles.bottomSpace}>
          {[
            { label: 'Tasks', colors: GRADIENTS.blue },
            { label: 'Focus', colors: GRADIENTS.purple },
            { label: 'Habits', colors: GRADIENTS.green },
          ].map((bubble) => (
            <TouchableOpacity key={bubble.label} style={styles.bubbleWrap}>
              <LinearGradient colors={bubble.colors} style={styles.bubble}>
                <Text style={styles.bubbleText}>{bubble.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 150 },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', marginBottom: 14 },
  headerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: {
    width: 44,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  dayPillActive: { backgroundColor: '#EFF6FF' },
  dayText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  dayDate: { fontSize: 14, fontWeight: '700', marginTop: 3, color: '#374151' },
  dayTextActive: { color: '#2563EB' },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  monthBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  monthBtnText: { color: '#111827', fontWeight: '600' },
  todayBtn: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#3B82F6',
  },
  todayBtnText: { color: '#FFF', fontWeight: '700' },
  timelineCard: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(255,255,255,0.84)',
    overflow: 'hidden',
    shadowColor: '#CBD5E1',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    height: 520,
  },
  timelineScroll: { flex: 1 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourText: {
    width: LABEL_WIDTH,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.24)',
    marginTop: 13,
    marginRight: 10,
  },
  taskContainer: {
    position: 'absolute',
    borderRadius: 14,
    overflow: 'hidden',
  },
  taskCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 9,
    paddingVertical: 8,
    justifyContent: 'space-between',
    shadowColor: '#64748B',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  taskTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  taskDuration: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600', marginTop: 6 },
  focusCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    backgroundColor: 'rgba(255,255,255,0.86)',
    padding: 14,
  },
  focusTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  focusEmpty: { marginTop: 8, color: '#64748B', fontSize: 14, lineHeight: 21 },
  bottomSpace: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
  },
  bubbleWrap: { padding: 4 },
  bubble: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748B',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  bubbleText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
