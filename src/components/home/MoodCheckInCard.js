import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { useAppData } from '../../contexts/AppDataContext';

const MOODS = [
  { mood: 'Calm',    emoji: '😌', color: '#60A5FA', bg: '#DBEAFE', gradient: ['#93C5FD', '#60A5FA'] },
  { mood: 'Active',  emoji: '🤩', color: '#FBBF24', bg: '#FEF3C7', gradient: ['#FCD34D', '#F59E0B'] },
  { mood: 'Steady',  emoji: '😐', color: '#A78BFA', bg: '#EDE9FE', gradient: ['#C4B5FD', '#8B5CF6'] },
  { mood: 'Tired',   emoji: '🥱', color: '#94A3B8', bg: '#E2E8F0', gradient: ['#CBD5E1', '#94A3B8'] },
  { mood: 'Anxious', emoji: '😰', color: '#F87171', bg: '#FEE2E2', gradient: ['#FCA5A5', '#EF4444'] },
];

const QUOTES = {
  Calm: [
    { text: 'The quieter you become, the more you are able to hear.', author: 'Ram Dass' },
    { text: 'Nothing in the world is softer than water, yet nothing is better at wearing down what is hard.', author: 'Lao Tzu' },
    { text: 'Within you there is a stillness and a sanctuary to which you can retreat at any time.', author: 'Hermann Hesse' },
    { text: 'Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.', author: 'Thích Nhất Hạnh' },
  ],
  Active: [
    { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'Amateurs sit and wait for inspiration. The rest of us just get up and go to work.', author: 'Stephen King' },
    { text: 'It is not enough to be busy. The question is: what are we busy about?', author: 'Henry David Thoreau' },
  ],
  Steady: [
    { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
    { text: 'Little by little, one travels far.', author: 'J.R.R. Tolkien' },
    { text: 'What we do every day matters more than what we do once in a while.', author: 'Gretchen Rubin' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  ],
  Tired: [
    { text: 'Rest is not idleness. To lie sometimes on the grass and listen to the murmur of water is hardly a waste of time.', author: 'John Lubbock' },
    { text: 'Sometimes the most productive thing you can do is rest.', author: 'Mark Black' },
    { text: 'Take rest; a field that has rested gives a bountiful crop.', author: 'Ovid' },
    { text: 'Rest when you are weary. Refresh and renew yourself, then return to your work.', author: 'Ralph Marston' },
  ],
  Anxious: [
    { text: 'You are not your thoughts. You are the awareness behind them.', author: 'Eckhart Tolle' },
    { text: 'Nothing diminishes anxiety faster than action.', author: 'Walter Anderson' },
    { text: 'Worry does not empty tomorrow of its sorrow. It empties today of its strength.', author: 'Corrie ten Boom' },
    { text: 'You have survived every difficult day so far. Today is not different.', author: 'Unknown' },
  ],
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function pickQuote(mood, date) {
  const pool = QUOTES[mood] || QUOTES.Steady;
  const key = `${date}-${mood}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length];
}

export default function MoodCheckInCard() {
  const { moodLogs, addMoodLog } = useAppData();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const today = todayISO();
  const todayLog = moodLogs.find((log) => log.logged_at?.slice(0, 10) === today);
  const matched = todayLog ? MOODS.find((m) => m.mood === todayLog.mood) : null;

  const quote = useMemo(
    () => (todayLog ? pickQuote(todayLog.mood, today) : null),
    [todayLog?.mood, today]
  );

  const handleSelect = async (mood) => {
    if (saving) return;
    setSaving(true);
    try {
      await addMoodLog({ mood, source: 'manual' });
      setEditing(false);
      Toast.show({
        type: 'success',
        text1: 'Mood logged',
        text2: mood,
        visibilityTime: 1500,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Could not log mood',
        text2: err?.message || 'Try again',
      });
    } finally {
      setSaving(false);
    }
  };

  // ---- Logged-in view ----
  if (todayLog && matched && !editing) {
    const loggedTime = new Date(todayLog.logged_at).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <LinearGradient
        colors={matched.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.moodChip}>
            <Text style={styles.moodChipEmoji}>{matched.emoji}</Text>
            <View>
              <Text style={styles.moodChipLabel}>Feeling {matched.mood}</Text>
              <Text style={styles.moodChipTime}>logged at {loggedTime}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.changeChip}
            activeOpacity={0.75}
          >
            <Text style={styles.changeChipText}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quoteBlock}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.quoteText}>{quote.text}</Text>
          <Text style={styles.quoteAuthor}>— {quote.author}</Text>
        </View>
      </LinearGradient>
    );
  }

  // ---- Picker view ----
  return (
    <View style={styles.pickerCard}>
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>
          {editing ? 'Pick a different mood' : 'How are you feeling?'}
        </Text>
      </View>

      <View style={styles.moodsRow}>
        {MOODS.map((m) => (
          <TouchableOpacity
            key={m.mood}
            style={styles.moodItem}
            onPress={() => handleSelect(m.mood)}
            disabled={saving}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={[m.bg, m.bg]}
              style={[styles.moodCircle, { borderColor: m.color + '55' }]}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
            </LinearGradient>
            <Text style={[styles.moodLabel, { color: m.color }]}>{m.mood}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {saving && (
        <View style={styles.savingRow}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      )}

      {editing && !saving && (
        <TouchableOpacity
          onPress={() => setEditing(false)}
          style={styles.cancelBtn}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ---- Logged-in hero ----
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moodChipEmoji: { fontSize: 26 },
  moodChipLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  moodChipTime: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  changeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  changeChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quoteBlock: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quoteMark: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 44,
    marginBottom: -10,
  },
  quoteText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  quoteAuthor: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ---- Picker ----
  pickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.15)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pickerHeader: { marginBottom: 14 },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.2,
  },
  moodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  moodItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  moodCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  moodEmoji: { fontSize: 26 },
  moodLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  savingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
});