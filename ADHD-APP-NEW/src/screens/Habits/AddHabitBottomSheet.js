import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '../../contexts/ThemeContext';
import ADHDButton from '../../components/common/ADHDButton';

const AddHabitBottomSheet = forwardRef(({ onSubmit }, ref) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [reminder, setReminder] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name, frequency, reminder });
    setName('');
    setFrequency('Daily');
    setReminder('');
  };

  return (
    <BottomSheet ref={ref} index={-1} snapPoints={['50%']} enablePanDownToClose backgroundStyle={{ backgroundColor: theme.card }}>
      <BottomSheetView style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>New Habit</Text>
        <TextInput placeholder="Habit name" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={name} onChangeText={setName} />
        <View style={styles.freqRow}>
          {['Daily', 'Weekly'].map(f => (
            <TouchableOpacity key={f} style={[styles.freqOption, { borderColor: theme.border }, frequency === f && { backgroundColor: theme.accentGradient[0] + '40' }]} onPress={() => setFrequency(f)}>
              <Text style={{ color: theme.text }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput placeholder="Reminder time (e.g., 08:00)" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={reminder} onChangeText={setReminder} />
        <ADHDButton title="Create Habit" onPress={handleSubmit} />
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 16 },
  freqRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  freqOption: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1 },
});

export default AddHabitBottomSheet;
