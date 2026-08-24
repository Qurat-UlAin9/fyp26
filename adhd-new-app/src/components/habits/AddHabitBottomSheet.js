// Similar to AddTaskBottomSheet.js, adapt for habits
import React, { useCallback, useMemo, useRef } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const AddHabitBottomSheet = ({ onAdd }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);
  const [habit, setHabit] = React.useState('');

  const handleSheetChanges = useCallback((index) => {
    if (index === -1) setHabit('');
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={{ backgroundColor: themeColors.background }}
    >
      <View style={styles.content}>
        <TextInput
          style={[styles.input, { color: themeColors.text, borderColor: themeColors.primary }]}
          placeholder="New Habit"
          value={habit}
          onChangeText={setHabit}
        />
        <Button title="Add" onPress={() => { onAdd(habit); bottomSheetRef.current.close(); }} color={themeColors.primary} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
});

export default AddHabitBottomSheet;