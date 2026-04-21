import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import CoinPill from '../../components/common/CoinPill';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

const entries = [
  { id: '1', type: 'task', title: 'Deep work', start: 9, end: 11 },
  { id: '2', type: 'habit', title: 'Medication', start: 12, end: 13 },
  { id: '3', type: 'focus', title: 'Focus Session', start: 15, end: 16, mood: '🙂' },
];

export default function TimelineScreen() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [coins] = useState(182);
  const hourHeight = 56;

  const mappedEntries = useMemo(
    () =>
      entries.map((item) => ({
        ...item,
        top: item.start * hourHeight,
        height: (item.end - item.start) * hourHeight - 8,
      })),
    []
  );

  return (
    <LinearGradient colors={['#F8FAFF', '#EEF2FF', '#F9FAFB']} style={styles.container}>
      <View style={styles.headerRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekStrip}>
          {WEEK.map((day) => (
            <View key={day} style={styles.dayPill}><Text style={styles.dayText}>{day}</Text></View>
          ))}
        </ScrollView>
        <CoinPill coins={coins} />
      </View>

      <View style={styles.timelineWrap}>
        <ScrollView>
          <View style={styles.timelineGrid}>
            <View style={styles.leftAxis}>
              {HOURS.map((h) => (
                <Text key={h} style={styles.hourLabel}>{h}</Text>
              ))}
            </View>

            <View style={styles.mainArea}>
              {HOURS.map((h, i) => (
                <LinearGradient
                  key={h}
                  colors={i >= 9 && i < 17 ? ['rgba(253,224,71,0.18)', 'rgba(253,224,71,0.02)'] : ['transparent', 'transparent']}
                  style={[styles.hourRow, { height: hourHeight }]}
                />
              ))}

              {mappedEntries.map((entry) => {
                const faded = activeFilter !== 'all' && activeFilter !== entry.type;
                if (entry.type === 'task') {
                  return <View key={entry.id} style={[styles.taskBlock, { top: entry.top, height: entry.height, opacity: faded ? 0.2 : 1 }]}><Text style={styles.blockText}>{entry.title}</Text></View>;
                }
                if (entry.type === 'habit') {
                  return <View key={entry.id} style={[styles.habitBlock, { top: entry.top + 12, opacity: faded ? 0.2 : 1 }]}><Text style={styles.blockText}>{entry.title}</Text></View>;
                }
                return (
                  <View key={entry.id} style={[styles.focusBlock, { top: entry.top, height: entry.height, opacity: faded ? 0.2 : 1 }]}>
                    <Text style={styles.blockText}>{entry.title}</Text>
                    <Text style={styles.moodPin}>{entry.mood}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.footerFilters}>
        {[
          { key: 'task', label: 'Tasks' },
          { key: 'habit', label: 'Habits' },
          { key: 'focus', label: 'Focus' },
          { key: 'mood', label: 'Mood' },
        ].map((item) => (
          <TouchableOpacity key={item.key} style={[styles.filterBubble, activeFilter === item.key && styles.filterBubbleActive]} onPress={() => setActiveFilter((f) => (f === item.key ? 'all' : item.key))}>
            <Text style={[styles.filterText, activeFilter === item.key && styles.filterTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 14 },
  headerRow: { paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  weekStrip: { gap: 8, paddingRight: 8 },
  dayPill: { backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  dayText: { color: '#334155', fontWeight: '700' },
  timelineWrap: { flex: 1, marginTop: 10, marginBottom: 74 },
  timelineGrid: { flexDirection: 'row', paddingBottom: 20 },
  leftAxis: { width: 62, paddingTop: 8 },
  hourLabel: { height: 56, color: '#94A3B8', fontSize: 12 },
  mainArea: { flex: 1, position: 'relative', marginRight: 14 },
  hourRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(203,213,225,0.3)' },
  taskBlock: {
    position: 'absolute',
    left: 10,
    right: 12,
    borderRadius: 12,
    backgroundColor: '#DDD6FE',
    padding: 8,
  },
  habitBlock: {
    position: 'absolute',
    left: 14,
    right: 60,
    borderRadius: 999,
    backgroundColor: '#93C5FD',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  focusBlock: {
    position: 'absolute',
    left: 20,
    right: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#22D3EE',
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: 8,
  },
  moodPin: { position: 'absolute', right: 8, top: 6, fontSize: 16 },
  blockText: { color: '#1E293B', fontWeight: '700', fontSize: 12 },
  footerFilters: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterBubble: {
    width: 76,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  filterBubbleActive: { backgroundColor: '#C4B5FD' },
  filterText: { fontWeight: '700', color: '#334155', fontSize: 12 },
  filterTextActive: { color: '#312E81' },
});
