import React, { forwardRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar, Bell, Sparkles } from 'lucide-react-native';

// ── Theme palette (must match TasksScreen) ────────────────────────────────────
const CARD_THEMES = [
  {
    id: 'coral',
    dot: '#FF6B7A',
    glow: 'rgba(255,107,122,0.55)',
    cardGradient: ['#FF6B7A', '#FF8FA3'],
    accent: '#FF6B7A',
    textLight: '#FFF5F5',
  },
  {
    id: 'sky',
    dot: '#4DA6FF',
    glow: 'rgba(77,166,255,0.55)',
    cardGradient: ['#4DA6FF', '#7EC8FF'],
    accent: '#4DA6FF',
    textLight: '#F0F8FF',
  },
  {
    id: 'mint',
    dot: '#3ECFA0',
    glow: 'rgba(62,207,160,0.55)',
    cardGradient: ['#3ECFA0', '#6EECC0'],
    accent: '#3ECFA0',
    textLight: '#F0FFF8',
  },
  {
    id: 'lavender',
    dot: '#9B7FE8',
    glow: 'rgba(155,127,232,0.55)',
    cardGradient: ['#9B7FE8', '#C4AAFF'],
    accent: '#9B7FE8',
    textLight: '#F7F4FF',
  },
  {
    id: 'teal',
    dot: '#2EC4B6',
    glow: 'rgba(46,196,182,0.55)',
    cardGradient: ['#2EC4B6', '#5EEADC'],
    accent: '#2EC4B6',
    textLight: '#F0FFFD',
  },
];

const getTheme = (id) => CARD_THEMES.find((t) => t.id === id) || CARD_THEMES[0];

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─────────────────────────────────────────────────────────────────────────────
const AddTaskBottomSheet = forwardRef(({ onSubmit }, ref) => {
  const snapPoints = useMemo(() => ['88%'], []);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('coral');

  const th = getTheme(selectedTheme);

  const reset = () => {
    setTitle('');
    setDueDate('');
    setNotifEnabled(false);
    setSelectedTheme('coral');
  };

  const handleClose = () => {
    reset();
    ref.current?.close();
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSubmit({
      id: Date.now().toString(),
      title: title.trim(),
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      themeId: selectedTheme,
      notifEnabled,
      startHour: '09',
      endHour: '11',
      expanded: false,
      completedRewarded: false,
      completedAt: null,
      subtasks: [
        { id: `${Date.now()}-1`, title: `Research ${title.trim()}`, done: false },
        { id: `${Date.now()}-2`, title: `Plan approach`, done: false },
        { id: `${Date.now()}-3`, title: `Execute & review`, done: false },
      ],
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
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.sheetTitle}>New Task</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X color="#64748B" size={20} />
          </TouchableOpacity>
        </View>

        {/* ── Task Name ── */}
        <Text style={styles.label}>TASK NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="What do you need to do?"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          multiline
        />

        {/* ── Due Date ── */}
        <Text style={styles.label}>DUE DATE</Text>
        <View style={styles.rowInput}>
          <Calendar size={17} color="#6366F1" />
          <TextInput
            style={styles.flexInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            value={dueDate}
            onChangeText={setDueDate}
          />
        </View>

        {/* ── Notifications ── */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Bell size={16} color={notifEnabled ? th.accent : '#94A3B8'} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.toggleLabel}>Reminders</Text>
              <Text style={styles.toggleSub}>Notify me before due date</Text>
            </View>
          </View>
          <Switch
            value={notifEnabled}
            onValueChange={setNotifEnabled}
            trackColor={{ false: '#E2E8F0', true: th.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* ── Theme Picker ── */}
        <Text style={styles.label}>CHOOSE THEME</Text>
        <View style={styles.themeRow}>
          {CARD_THEMES.map((t) => {
            const isSelected = selectedTheme === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setSelectedTheme(t.id)}
                style={styles.dotWrapper}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.themeDot,
                    { backgroundColor: t.dot },
                    isSelected && {
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                      shadowColor: t.dot,
                      shadowRadius: 12,
                      shadowOpacity: 1,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 12,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Live Preview ── */}
        {title.length > 0 && (
          <LinearGradient
            colors={th.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <Text style={[styles.previewTitle, { color: th.textLight }]}>
              {title}
            </Text>
            {dueDate ? (
              <Text style={[styles.previewDate, { color: th.textLight }]}>
                📅 {formatDate(dueDate)}
              </Text>
            ) : null}
          </LinearGradient>
        )}

        {/* ── Save Button ── */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={styles.saveBtnWrap}>
          <LinearGradient
            colors={[th.accent, th.cardGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Sparkles color="#fff" size={18} />
            <Text style={styles.saveBtnText}>Save Task</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Cancel ── */}
        <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export default AddTaskBottomSheet;

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 24,
  },
  handle: {
    backgroundColor: '#475569',
    width: 40,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Labels
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Inputs
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#F1F5F9',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 52,
  },
  rowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 52,
    gap: 10,
    marginBottom: 20,
  },
  flexInput: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 15,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 14,
  },
  toggleSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },

  // Theme dots
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  dotWrapper: { padding: 4 },
  themeDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // Preview
  previewCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  previewTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  previewDate: {
    fontSize: 13,
    opacity: 0.82,
    fontWeight: '500',
  },

  // Save / Cancel
  saveBtnWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
});