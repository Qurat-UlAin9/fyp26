import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import GlassCard from '../common/GlassCard';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const TaskCard = ({ task, onComplete }) => {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: themeColors.text }]}>{task.title}</Text>
        <TouchableOpacity onPress={onComplete}>
          <CheckCircle color={task.completed ? themeColors.success : themeColors.text} size={24} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.time, { color: themeColors.text }]}>{task.time}</Text>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
  },
  time: {
    fontSize: 14,
    marginTop: 5,
  },
});

export default TaskCard;