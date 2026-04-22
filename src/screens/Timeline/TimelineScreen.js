import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useProductivity } from '../../contexts/ProductivityContext';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 62;
const TIME_COL_WIDTH = 54;

const GRADIENTS = [
  ['#FF9A8B', '#FF6A88'],
  ['#5DAEFF', '#3A8DFF'],
  ['#6EE7B7', '#34D399'],
  ['#A78BFA', '#7C3AED'],
  ['#FFD166', '#FCA311'],
  ['#4FD1C5', '#2CB1BC'],
  ['#FF7EB3', '#FF4D6D'],
];

const formatHour = (hour) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const base = hour % 12 === 0 ? 12 : hour % 12;
  return `${base} ${suffix}`;
};

export default function TimelineScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { tasks } = useProductivity();
  const [selectedDay, setSelectedDay] = useState('Mon');

  const hours = useMemo(() => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, idx) => START_HOUR + idx), []);
  const gridHeight = hours.length * HOUR_HEIGHT;
  const timelineWidth = Math.max(220, width - 32 - TIME_COL_WIDTH - 12);
  const dayWidth = timelineWidth / 7;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Focus Timeline</Text>

        <BlurView intensity={24} tint="light" style={styles.headerCard}>
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day) => (
              <TouchableOpacity key={day} style={[styles.dayPill, selectedDay === day && styles.dayPillActive]} onPress={() => setSelectedDay(day)}>
                <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.monthBtn}><Text style={styles.monthBtnText}>May 2023 ▾</Text></TouchableOpacity>
            <TouchableOpacity style={styles.todayBtn}><Text style={styles.todayBtnText}>Today</Text></TouchableOpacity>
          </View>
        </BlurView>

        <View style={styles.timelineCard}>
          <View style={styles.daysHeaderRow}>
            <View style={{ width: TIME_COL_WIDTH }} />
            <View style={[styles.dayHeaderGrid, { width: timelineWidth }]}>
              {WEEK_DAYS.map((d) => (
                <View key={d} style={[styles.dayHeaderCell, { width: dayWidth }]}>
                  <Text style={styles.dayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>
          </View>

          <ScrollView style={{ maxHeight: 520 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            <View style={[styles.gridRow, { height: gridHeight }]}> 
              <View style={styles.timeColumn}>
                {hours.map((hour, index) => (
                  <Text key={hour} style={[styles.hourText, { top: index * HOUR_HEIGHT + 2 }]}>{formatHour(hour)}</Text>
                ))}
              </View>

              <View style={[styles.dayGridArea, { width: timelineWidth }]}>
                {WEEK_DAYS.map((day, idx) => (
                  <View key={day} style={[styles.dayColumn, { left: idx * dayWidth, width: dayWidth }]} />
                ))}
                {hours.map((hour, index) => (
                  <View key={`line-${hour}`} style={[styles.hourLine, { top: index * HOUR_HEIGHT }]} />
                ))}

                {tasks.map((task, index) => {
                  const dayIndex = WEEK_DAYS.indexOf(task.dayKey);
                  const top = (task.startHour - START_HOUR) * HOUR_HEIGHT + 6;
                  const taskHeight = Math.max(48, task.duration * HOUR_HEIGHT - 10);
                  const left = Math.max(0, dayIndex) * dayWidth + 4;
                  return (
                    <TouchableOpacity key={task.id} style={[styles.taskWrap, { top, left, width: dayWidth - 8, height: taskHeight }]} activeOpacity={0.9}>
                      <LinearGradient colors={GRADIENTS[index % GRADIENTS.length]} style={styles.taskCard}>
                        <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                        <Text style={styles.taskTime}>{formatHour(task.startHour)} · {task.duration}h</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>

        <View style={styles.focusCard}>
          <Text style={styles.focusTitle}>Focus</Text>
          <Text style={styles.focusEmpty}>Start a task to begin your focus journey ✨</Text>
        </View>

        <View style={styles.bottomSpace}>
          <TouchableOpacity style={styles.bubbleBtn} onPress={() => navigation.navigate('Tasks')}>
            <LinearGradient colors={['#5DAEFF', '#3A8DFF']} style={styles.bubble}><Text style={styles.bubbleText}>Tasks</Text></LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bubbleBtn} onPress={() => navigation.navigate('Focus')}>
            <LinearGradient colors={['#A78BFA', '#7C3AED']} style={styles.bubble}><Text style={styles.bubbleText}>Focus</Text></LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bubbleBtn} onPress={() => navigation.navigate('Habits')}>
            <LinearGradient colors={['#6EE7B7', '#34D399']} style={styles.bubble}><Text style={styles.bubbleText}>Habits</Text></LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 150 },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', marginBottom: 14 },
  headerCard: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', backgroundColor: 'rgba(255,255,255,0.72)', padding: 10, marginBottom: 14 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: { paddingVertical: 6, minWidth: 42, borderRadius: 12, alignItems: 'center' },
  dayPillActive: { backgroundColor: '#EFF6FF' },
  dayText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  dayTextActive: { color: '#2563EB' },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  monthBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.35)' },
  monthBtnText: { color: '#111827', fontWeight: '600' },
  todayBtn: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#3B82F6' },
  todayBtnText: { color: '#FFF', fontWeight: '700' },
  timelineCard: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(148,163,184,0.25)', backgroundColor: 'rgba(255,255,255,0.9)', overflow: 'hidden' },
  daysHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.2)' },
  dayHeaderGrid: { flexDirection: 'row' },
  dayHeaderCell: { paddingVertical: 8, alignItems: 'center' },
  dayHeaderText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  gridRow: { flexDirection: 'row' },
  timeColumn: { width: TIME_COL_WIDTH, position: 'relative' },
  hourText: { position: 'absolute', left: 5, fontSize: 10, color: '#6B7280', fontWeight: '600' },
  dayGridArea: { position: 'relative' },
  dayColumn: { position: 'absolute', top: 0, bottom: 0, borderRightWidth: 1, borderRightColor: 'rgba(148,163,184,0.2)' },
  hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(148,163,184,0.2)' },
  taskWrap: { position: 'absolute', borderRadius: 13, overflow: 'hidden' },
  taskCard: { flex: 1, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 13 },
  taskTitle: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  taskTime: { color: 'rgba(255,255,255,0.92)', fontSize: 10, marginTop: 6, fontWeight: '600' },
  focusCard: { marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', backgroundColor: 'rgba(255,255,255,0.86)', padding: 14 },
  focusTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  focusEmpty: { marginTop: 8, color: '#64748B', fontSize: 14 },
  bottomSpace: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-around' },
  bubbleBtn: { padding: 4 },
  bubble: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  bubbleText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
