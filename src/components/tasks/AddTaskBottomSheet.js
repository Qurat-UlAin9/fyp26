import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../contexts/ThemeContext';
import ADHDButton from '../common/ADHDButton';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AddTaskBottomSheet = forwardRef(({ onSubmit }, ref) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [workload, setWorkload] = useState('Medium');
  const [dayKey, setDayKey] = useState('Mon');
  const [startHour, setStartHour] = useState('9');
  const [duration, setDuration] = useState('1');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title, deadline, workload, dayKey, startHour, duration });
    setTitle('');
    setDeadline('');
    setWorkload('Medium');
    setDayKey('Mon');
    setStartHour('9');
    setDuration('1');
  };

  return (
    <BottomSheet ref={ref} index={-1} snapPoints={['72%']} enablePanDownToClose backgroundStyle={{ backgroundColor: theme.card }}>
      <BottomSheetView style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Add New Task</Text>
        <TextInput
          placeholder="Task title"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          placeholder="Deadline (YYYY-MM-DD)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={deadline}
          onChangeText={setDeadline}
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Day</Text>
        <View style={styles.daysRow}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              onPress={() => setDayKey(day)}
              style={[styles.dayPill, { borderColor: theme.border }, day === dayKey && { backgroundColor: theme.accentGradient[0] + '40' }]}
            >
              <Text style={{ color: theme.text, fontSize: 12 }}>{day}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inlineRow}>
          <TextInput
            placeholder="Start hour (6-22)"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            style={[styles.input, styles.inlineInput, { color: theme.text, borderColor: theme.border }]}
            value={startHour}
            onChangeText={setStartHour}
          />
          <TextInput
            placeholder="Duration (hours)"
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            style={[styles.input, styles.inlineInput, { color: theme.text, borderColor: theme.border }]}
            value={duration}
            onChangeText={setDuration}
          />
        </View>

        <View style={styles.workloadRow}>
          {['Low', 'Medium', 'High'].map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.workloadOption,
                { borderColor: theme.border },
                workload === level && { backgroundColor: theme.accentGradient[0] + '40' }
              ]}
              onPress={() => setWorkload(level)}
            >
              <Text style={{ color: theme.text }}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ADHDButton title="Create Task" onPress={handleSubmit} />
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  dayPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  inlineRow: { flexDirection: 'row', gap: 10 },
  inlineInput: { flex: 1 },
  workloadRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, marginTop: 8 },
  workloadOption: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
});

export default AddTaskBottomSheet;
