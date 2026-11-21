import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getExerciseDone,
  subscribeExerciseDone,
  dismissExerciseDone,
  queueCoachEvent,
} from '../../utils/coachNav';

// Shown at the bottom of an exercise screen when the user finishes it.
// One tap tells the coach how it went and takes the user back to the chat,
// where the coach reacts and offers the next step.
const FEELINGS = [
  { id: 'better', label: 'Feeling better', phrase: 'I feel better now.' },
  { id: 'same', label: 'About the same', phrase: 'I feel about the same.' },
  { id: 'tough', label: 'Still tough', phrase: 'It is still tough for me.' },
];

export default function CoachDoneCard({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const [info, setInfo] = useState(getExerciseDone());

  useEffect(() => subscribeExerciseDone(setInfo), []);

  if (!info || info.routeName !== route?.name) return null;

  const close = () => {
    const goBack = info.goBackOnDismiss;
    dismissExerciseDone();
    if (goBack && navigation.canGoBack()) navigation.goBack();
  };

  const tellCoach = (feeling) => {
    const detail = info.summary ? ` (${info.summary})` : '';
    queueCoachEvent(`I finished ${info.label}${detail}. ${feeling.phrase}`);
    dismissExerciseDone();
    if (typeof navigation.popTo === 'function') navigation.popTo('Chatbot');
    else navigation.navigate('Chatbot');
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? '#1E1B4B' : '#FFFFFF', borderColor: theme.border },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>Nice work 🌿</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          {info.summary ? `${info.summary}. ` : ''}How do you feel now? Tell your coach and we'll pick the next step together.
        </Text>

        <View style={styles.row}>
          {FEELINGS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, { borderColor: theme.accentGradient[0] }]}
              activeOpacity={0.8}
              onPress={() => tellCoach(f)}
            >
              <Text style={[styles.chipText, { color: theme.accentGradient[0] }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={close} hitSlop={8} style={styles.skip}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 24, zIndex: 60, elevation: 30 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sub: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  chipText: { fontWeight: '700', fontSize: 13 },
  skip: { alignSelf: 'center', marginTop: 12 },
  skipText: { fontSize: 12, fontWeight: '600' },
});
