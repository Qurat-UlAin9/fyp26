import React, { forwardRef, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';

const PRESET_SLOTS = ['Morning', 'Noon', 'Evening', 'Night'];
const COLOR_OPTIONS = [
  { id: 'coral', colors: ['#FF9A8B', '#FF6A88'] },
  { id: 'blue', colors: ['#5DAEFF', '#3A8DFF'] },
  { id: 'green', colors: ['#6EE7B7', '#34D399'] },
  { id: 'purple', colors: ['#A78BFA', '#7C3AED'] },
  { id: 'teal', colors: ['#4FD1C5', '#2CB1BC'] },
];
const DURATION_OPTIONS = [
  { id: 7, label: '7 days' },
  { id: 14, label: '14 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
  { id: null, label: 'Forever' },
];

const AddHabitBottomSheet = forwardRef(({ onSubmit, initialHabit, onClose }, ref) => {
  const snapPoints = useMemo(() => ['85%'], []);
  const isEdit = Boolean(initialHabit);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedSlots, setSelectedSlots] = useState(['Morning']);
  const [targetDays, setTargetDays] = useState(null);

  useEffect(() => {
    if (initialHabit) {
      setName(initialHabit.name || initialHabit.title || '');
      const colorMatch = COLOR_OPTIONS.find(
        (c) =>
          Array.isArray(initialHabit.gradient) &&
          initialHabit.gradient[0] === c.colors[0]
      );
      setSelectedColor(colorMatch || COLOR_OPTIONS[0]);
      setSelectedSlots(
        Array.isArray(initialHabit.timeSlots) && initialHabit.timeSlots.length > 0
          ? initialHabit.timeSlots
          : ['Morning']
      );
      setTargetDays(initialHabit.targetDays ?? initialHabit.metadata?.targetDays ?? null);
    } else {
      setName('');
      setSelectedColor(COLOR_OPTIONS[0]);
      setSelectedSlots(['Morning']);
      setTargetDays(null);
    }
  }, [initialHabit]);

  const reset = () => {
    setName('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setSelectedSlots(['Morning']);
    setTargetDays(null);
  };

  const handleClose = () => {
    reset();
    ref.current?.close();
    onClose?.();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (selectedSlots.length === 0) return;

    onSubmit({
      id: initialHabit?.id || Date.now().toString(),
      name: name.trim(),
      title: name.trim(),
      timeSlots: selectedSlots,
      // Preserve existing completions when editing; reset when new
      completions:
        isEdit && Array.isArray(initialHabit?.completions) &&
        initialHabit.completions.length === selectedSlots.length
          ? initialHabit.completions
          : new Array(selectedSlots.length).fill(false),
      gradient: selectedColor.colors,
      reminder: 'Smart Reminder',
      targetDays,
    });
    reset();
    ref.current?.close();
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={() => onClose?.()}
      keyboardBehavior="interactive"
      backgroundStyle={styles.sheetBg}
      onChange={(index) => { if (index === -1) onClose?.(); }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEdit ? 'Edit Habit' : 'New Habit'}</Text>
          <TouchableOpacity onPress={handleClose}>
            <X color="#94A3B8" size={24} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>HABIT NAME</Text>
        <TextInput
          placeholder="e.g. Walk"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>CHOOSE THEME</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedColor(item)}
              style={[
                styles.colorRing,
                selectedColor.id === item.id && { borderColor: item.colors[0] },
              ]}
            >
              <LinearGradient colors={item.colors} style={styles.colorCircle} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>TIME SLOTS</Text>
        <View style={styles.slotRow}>
          {PRESET_SLOTS.map((slot) => {
            const active = selectedSlots.includes(slot);
            return (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.slotPill,
                  active && {
                    backgroundColor: selectedColor.colors[0] + '20',
                    borderColor: selectedColor.colors[0],
                  },
                ]}
                onPress={() =>
                  setSelectedSlots((prev) =>
                    prev.includes(slot)
                      ? prev.filter((s) => s !== slot)
                      : [...prev, slot]
                  )
                }
              >
                <Text
                  style={[
                    styles.slotPillText,
                    active && { color: selectedColor.colors[0] },
                  ]}
                >
                  {slot}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>HOW LONG? (OPTIONAL)</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((d) => {
            const active = targetDays === d.id;
            return (
              <TouchableOpacity
                key={String(d.id)}
                style={[
                  styles.durationPill,
                  active && {
                    backgroundColor: selectedColor.colors[0] + '20',
                    borderColor: selectedColor.colors[0],
                  },
                ]}
                onPress={() => setTargetDays(active ? null : d.id)}
              >
                <Text
                  style={[
                    styles.durationText,
                    active && { color: selectedColor.colors[0] },
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.submitContainer}>
          <LinearGradient colors={selectedColor.colors} style={styles.submitBtn}>
            <Text style={styles.submitText}>
              {isEdit ? 'Save Changes' : 'Save Habit'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export default AddHabitBottomSheet;

const styles = StyleSheet.create({
  sheetBg: { borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  content: { padding: 24, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 12, letterSpacing: 1 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  colorRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  slotPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  slotPillText: { fontWeight: '700', color: '#64748B' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  durationPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  durationText: { fontWeight: '700', color: '#64748B', fontSize: 13 },
  submitContainer: {},
  submitBtn: { padding: 18, borderRadius: 20, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});