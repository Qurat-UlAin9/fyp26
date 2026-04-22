import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';

const PRESET_SLOTS = ['Morning', 'Noon', 'Evening', 'Night'];

const AddHabitBottomSheet = forwardRef(({ onSubmit }, ref) => {
  const snapPoints = useMemo(() => ['68%'], []);
  const [name, setName] = useState('');
  const [repeatCount, setRepeatCount] = useState(3);
  const [selectedSlots, setSelectedSlots] = useState(['Morning', 'Evening']);
  const [customSlot, setCustomSlot] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const toggleSlot = (slot) => {
    setSelectedSlots((prev) => (prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot]));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const normalizedSlots = [...selectedSlots, ...(customSlot.trim() ? [customSlot.trim()] : [])];
    onSubmit({
      name: name.trim(),
      repeatCount: Math.max(1, Math.min(6, repeatCount)),
      timeSlots: normalizedSlots.length ? normalizedSlots : PRESET_SLOTS,
      reminderEnabled,
    });
    setName('');
    setRepeatCount(3);
    setCustomSlot('');
    setSelectedSlots(['Morning', 'Evening']);
    setReminderEnabled(true);
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Add Habit</Text>

        <Text style={styles.label}>Habit name</Text>
        <TextInput
          placeholder="e.g., Read 10 pages"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Repetitions per day</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity style={styles.counterBtn} onPress={() => setRepeatCount((v) => Math.max(1, v - 1))}>
            <Text style={styles.counterText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{repeatCount}</Text>
          <TouchableOpacity style={styles.counterBtn} onPress={() => setRepeatCount((v) => Math.min(6, v + 1))}>
            <Text style={styles.counterText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Time slots</Text>
        <View style={styles.slotRow}>
          {PRESET_SLOTS.map((slot) => {
            const active = selectedSlots.includes(slot);
            return (
              <TouchableOpacity key={slot} style={[styles.slotPill, active && styles.slotPillActive]} onPress={() => toggleSlot(slot)}>
                <Text style={[styles.slotPillText, active && styles.slotPillTextActive]}>{slot}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          placeholder="Custom slot (optional)"
          placeholderTextColor="#94A3B8"
          style={styles.input}
          value={customSlot}
          onChangeText={setCustomSlot}
        />

        <TouchableOpacity style={styles.toggleRow} onPress={() => setReminderEnabled((prev) => !prev)}>
          <Text style={styles.label}>Reminder</Text>
          <View style={[styles.togglePill, reminderEnabled && styles.togglePillActive]}>
            <View style={[styles.toggleKnob, reminderEnabled && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete option available after creating</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSubmit} activeOpacity={0.9}>
          <LinearGradient colors={['#4FD1C5', '#2CB1BC']} style={styles.submitBtn}>
            <Text style={styles.submitText}>Save Habit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  handle: { backgroundColor: '#CBD5E1', width: 46 },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  counterText: { fontSize: 20, fontWeight: '700', color: '#4F46E5' },
  counterValue: { marginHorizontal: 18, fontSize: 18, fontWeight: '700', color: '#111827' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  slotPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    backgroundColor: '#FFFFFF',
  },
  slotPillActive: {
    borderColor: 'rgba(79,70,229,0.4)',
    backgroundColor: '#EEF2FF',
  },
  slotPillText: { color: '#6B7280', fontWeight: '600' },
  slotPillTextActive: { color: '#4F46E5' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  togglePill: {
    width: 54,
    height: 30,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    padding: 4,
    justifyContent: 'center',
  },
  togglePillActive: { backgroundColor: '#99F6E4' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  toggleKnobActive: { alignSelf: 'flex-end', backgroundColor: '#2CB1BC' },
  deleteBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  deleteText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  submitBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 14,
    shadowColor: '#2CB1BC',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});

export default AddHabitBottomSheet;
