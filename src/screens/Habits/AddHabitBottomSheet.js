import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Bell } from 'lucide-react-native';

const PRESET_SLOTS = ['Morning', 'Noon', 'Evening', 'Night'];
const COLOR_OPTIONS = [
  { id: 'coral', colors: ['#FF9A8B', '#FF6A88'] },
  { id: 'blue', colors: ['#5DAEFF', '#3A8DFF'] },
  { id: 'green', colors: ['#6EE7B7', '#34D399'] },
  { id: 'purple', colors: ['#A78BFA', '#7C3AED'] },
  { id: 'teal', colors: ['#4FD1C5', '#2CB1BC'] },
];

const AddHabitBottomSheet = forwardRef(({ onSubmit }, ref) => {
  const snapPoints = useMemo(() => ['85%'], []);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedSlots, setSelectedSlots] = useState(['Morning']);

  const handleSave = () => {
    if (!name.trim()) return;
    onSubmit({
      id: Date.now().toString(),
      name: name.trim(),
      timeSlots: selectedSlots,
      completions: new Array(selectedSlots.length).fill(false),
      gradient: selectedColor.colors,
      reminder: 'Smart Reminder',
    });
    setName('');
    setSelectedSlots(['Morning']);
    ref.current?.close();
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive" // Ensures sheet pushes above keyboard
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>New Habit</Text>
          <TouchableOpacity onPress={() => ref.current?.close()}><X color="#94A3B8" size={24} /></TouchableOpacity>
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
              style={[styles.colorRing, selectedColor.id === item.id && { borderColor: item.colors[0] }]}
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
                style={[styles.slotPill, active && { backgroundColor: selectedColor.colors[0] + '20', borderColor: selectedColor.colors[0] }]}
                onPress={() => setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot])}
              >
                <Text style={[styles.slotPillText, active && { color: selectedColor.colors[0] }]}>{slot}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.submitContainer}>
          <LinearGradient colors={selectedColor.colors} style={styles.submitBtn}>
            <Text style={styles.submitText}>Save Habit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBg: { borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  content: { padding: 24, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '800', color: '#94A3B8', marginBottom: 12, letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  colorRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  slotPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
  slotPillText: { fontWeight: '700', color: '#64748B' },
  submitBtn: { padding: 18, borderRadius: 20, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});

export default AddHabitBottomSheet;
