import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Star } from 'lucide-react-native';

const MOODS = [
  { mood: 'Calm',   emoji: '😌' },
  { mood: 'Active', emoji: '🤩' },
  { mood: 'Steady', emoji: '😐' },
  { mood: 'Tired',  emoji: '🥱' },
];

export default function SessionReflectionModal({
  visible,
  minutesCompleted,
  onSave,
  onSkip,
}) {
  const [mood, setMood] = useState(null);
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ mood, rating });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#22D3EE', '#A78BFA', '#F472B6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentBar}
          />

          <TouchableOpacity onPress={handleSkip} style={styles.closeBtn}>
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <Text style={styles.heading}>Session complete 🎉</Text>
          <Text style={styles.subheading}>
            You focused for {minutesCompleted} minute{minutesCompleted === 1 ? '' : 's'}
          </Text>

          <Text style={styles.sectionLabel}>How do you feel now?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => {
              const active = mood === m.mood;
              return (
                <TouchableOpacity
                  key={m.mood}
                  onPress={() => setMood(m.mood)}
                  style={[styles.moodItem, active && styles.moodItemActive]}
                  activeOpacity={0.75}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, active && styles.moodLabelActive]}>
                    {m.mood}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>How focused were you?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setRating(n)}
                style={styles.starBtn}
                activeOpacity={0.75}
              >
                <Star
                  size={28}
                  color={n <= rating ? '#FBBF24' : '#CBD5E1'}
                  fill={n <= rating ? '#FBBF24' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveBtnWrap}
            activeOpacity={0.85}
            disabled={saving}
          >
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save reflection</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 22,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  accentBar: { width: '100%', height: 5 },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148,163,184,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 24,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 22,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    marginLeft: 22,
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
    paddingHorizontal: 20,
  },
  moodItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  moodItemActive: {
    borderColor: '#667EEA',
    backgroundColor: 'rgba(102,126,234,0.1)',
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  moodLabelActive: { color: '#667EEA' },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 26,
  },
  starBtn: { padding: 2 },
  saveBtnWrap: {
    width: '100%',
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skipBtn: { paddingVertical: 8 },
  skipText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});