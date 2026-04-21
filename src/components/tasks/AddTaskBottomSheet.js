import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import ADHDButton from '../common/ADHDButton';

const AddTaskBottomSheet = forwardRef(({ onSubmit }, ref) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [workload, setWorkload] = useState('Medium');
  const snapPoints = useMemo(() => ['50%'], []);

  const renderBackdrop = (props) => (
    <BottomSheetBackdrop {...props} opacity={0.3} appearsOnIndex={0} disappearsOnIndex={-1}>
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
    </BottomSheetBackdrop>
  );

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title, deadline, workload });
    setTitle('');
    setDeadline('');
    setWorkload('Medium');
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#FFFFFF', opacity: 0.9 }}
    >
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
        <View style={styles.workloadRow}>
          {['Low', 'Medium', 'High'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.workloadOption,
                { borderColor: theme.border },
                workload === level && { backgroundColor: `${theme.accentGradient[0]}40` },
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
  input: { borderWidth: 1, borderRadius: 16, padding: 12, fontSize: 16, marginBottom: 16 },
  workloadRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  workloadOption: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
});

export default AddTaskBottomSheet;
