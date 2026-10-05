import React, { forwardRef, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Calendar, Bell, Sparkles } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { suggestSubtasks } from '../../services/api';
import { showConfirm } from '../../utils/alert';

const CARD_THEMES = [
  { id: 'coral',    dot: '#FF6B7A', cardGradient: ['#FF6B7A', '#FF8FA3'], accent: '#FF6B7A', textLight: '#FFF5F5' },
  { id: 'sky',      dot: '#4DA6FF', cardGradient: ['#4DA6FF', '#7EC8FF'], accent: '#4DA6FF', textLight: '#F0F8FF' },
  { id: 'mint',     dot: '#3ECFA0', cardGradient: ['#3ECFA0', '#6EECC0'], accent: '#3ECFA0', textLight: '#F0FFF8' },
  { id: 'lavender', dot: '#9B7FE8', cardGradient: ['#9B7FE8', '#C4AAFF'], accent: '#9B7FE8', textLight: '#F7F4FF' },
  { id: 'teal',     dot: '#2EC4B6', cardGradient: ['#2EC4B6', '#5EEADC'], accent: '#2EC4B6', textLight: '#F0FFFD' },
];

const CATEGORIES = [
  { id: 'academic', label: 'Academic', emoji: '📚' },
  { id: 'work',     label: 'Work',     emoji: '💼' },
  { id: 'health',   label: 'Health',   emoji: '🌿' },
  { id: 'home',     label: 'Home',     emoji: '🏠' },
  { id: 'social',   label: 'Social',   emoji: '👥' },
  { id: 'finance',  label: 'Finance',  emoji: '💰' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'personal', label: 'Personal', emoji: '✨' },
];

const getTheme = (id) => CARD_THEMES.find((t) => t.id === id) || CARD_THEMES[0];

const toISODate = (val) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const DEFAULT_DEADLINE_DAYS = 3;

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_DEADLINE_DAYS);
  return toISODate(d);
}

function validateDeadline(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return 'Please enter a valid date (YYYY-MM-DD).';
  }
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return 'Invalid date.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() < today.getTime()) return 'Deadline cannot be in the past.';
  return null;
}

const AddTaskBottomSheet = forwardRef(({ onSubmit, initialTask, onClose }, ref) => {
  const snapPoints = useMemo(() => ['92%'], []);
  const isEdit = Boolean(initialTask);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null);
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('coral');
  const [priority, setPriority] = useState('Medium');
  const [generating, setGenerating] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState(null);

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setCategory(initialTask.category || null);
      setSubject(initialTask.subject || '');
      setDueDate(toISODate(initialTask.dueDate || initialTask.due_date));
      setSelectedTheme(initialTask.themeId || 'coral');
      setPriority(initialTask.priority || 'Medium');
      setNotifEnabled(false);
    } else {
      setTitle('');
      setCategory(null);
      setSubject('');
      setDueDate(defaultDeadline());
      setSelectedTheme('coral');
      setPriority('Medium');
      setNotifEnabled(false);
    }
    cancelledRef.current = false;
    setGenerating(false);
    setSchedulePreview(null);
  }, [initialTask]);

  const th = getTheme(selectedTheme);

  const reset = () => {
    setTitle('');
    setCategory(null);
    setSubject('');
    setDueDate('');
    setNotifEnabled(false);
    setSelectedTheme('coral');
    setPriority('Medium');
    setGenerating(false);
    setSchedulePreview(null);
    cancelledRef.current = false;
  };

  const handleClose = () => {
    cancelledRef.current = true;
    reset();
    ref.current?.close();
    onClose?.();
  };

  const generateFromAI = async (titleText, deadline) => {
    try {
      const response = await suggestSubtasks(titleText, {
        category,
        subject,
        deadline,
      });
      const returned = response?.data?.subtasks;

      if (Array.isArray(returned) && returned.length > 0) {
        return returned.map((s, i) => ({
          id: s.id || `${Date.now()}-${i}`,
          title: String(s.title || s),
          done: false,
          scheduledDate: s.scheduledDate,
          scheduledHour: s.scheduledHour,
          durationMins: s.durationMins,
        }));
      }
      return null;
    } catch (err) {
      console.warn('Subtask generation failed:', err?.message);
      return null;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    const deadlineError = validateDeadline(dueDate);
    if (deadlineError) {
      Toast.show({
        type: 'error',
        text1: 'Deadline required',
        text2: deadlineError,
        visibilityTime: 2400,
      });
      return;
    }

    cancelledRef.current = false;
    setGenerating(true);
    setSchedulePreview(null);

    const trimmedTitle = title.trim();
    const trimmedSubject = subject.trim();
    let finalSubtasks;

    if (
      isEdit &&
      Array.isArray(initialTask?.subtasks) &&
      initialTask.subtasks.length > 0
    ) {
      const oldTitle = (initialTask.title || '').trim();
      const oldDue = toISODate(initialTask.dueDate || initialTask.due_date);
      const titleChanged = oldTitle.toLowerCase() !== trimmedTitle.toLowerCase();
      const deadlineChanged = oldDue !== dueDate;

      if (titleChanged || deadlineChanged) {
        setGenerating(false);
        const shouldRegen = await showConfirm(
          'Regenerate schedule?',
          'Title or deadline changed. Regenerate subtasks and reschedule them?',
          'Regenerate',
          'Keep current'
        );

        if (shouldRegen) {
          setGenerating(true);
          finalSubtasks =
            (await generateFromAI(trimmedTitle, dueDate)) ||
            initialTask.subtasks;
        } else {
          finalSubtasks = initialTask.subtasks;
        }
      } else {
        finalSubtasks = initialTask.subtasks;
      }
    } else {
      finalSubtasks = await generateFromAI(trimmedTitle, dueDate);
    }

    setGenerating(false);

    if (cancelledRef.current) return;

    // Show preview if we generated subtasks
    if (finalSubtasks && finalSubtasks.length > 0) {
      setSchedulePreview(finalSubtasks);
    }

    onSubmit({
      id: initialTask?.id || Date.now().toString(),
      title: trimmedTitle,
      category,
      subject: trimmedSubject || null,
      dueDate,
      themeId: selectedTheme,
      notifEnabled,
      priority,
      startHour: initialTask?.startHour || '09',
      endHour: initialTask?.endHour || '11',
      expanded: false,
      completedRewarded: initialTask?.completedRewarded || false,
      completedAt: initialTask?.completedAt || null,
      subtasks: finalSubtasks || [],
    });

    reset();
    ref.current?.close();
  };

  const renderSchedulePreview = () => {
    if (!schedulePreview || schedulePreview.length === 0) return null;
    return (
      <View style={styles.previewScheduleWrap}>
        <Text style={styles.label}>SCHEDULE</Text>
        {schedulePreview.map((s, i) => (
          <View key={s.id || i} style={styles.scheduleRow}>
            <View style={[styles.scheduleDot, { backgroundColor: th.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scheduleTitle} numberOfLines={2}>
                {s.title}
              </Text>
              {s.scheduledDate ? (
                <Text style={styles.scheduleDate}>
                  {formatDate(s.scheduledDate)}
                  {s.scheduledHour != null
                    ? ` · ${String(s.scheduledHour).padStart(2, '0')}:00`
                    : ''}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={!generating}
      onClose={() => onClose?.()}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.sheetTitle}>
            {isEdit ? 'Edit Task' : 'New Task'}
          </Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            disabled={generating}
          >
            <X color="#64748B" size={20} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>TASK NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="What do you need to do?"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          multiline
          editable={!generating}
        />

        <Text style={styles.label}>DEADLINE (REQUIRED)</Text>
        <View style={styles.rowInput}>
          <Calendar size={17} color="#6366F1" />
          <TextInput
            style={styles.flexInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            value={dueDate}
            onChangeText={setDueDate}
            editable={!generating}
          />
        </View>
        <Text style={styles.helperText}>
          We'll spread the steps across the days before this date so you're not
          cramming at the last minute.
        </Text>

        <Text style={styles.label}>CATEGORY</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategory(active ? null : c.id)}
                style={[
                  styles.categoryChip,
                  active && {
                    borderColor: th.accent,
                    backgroundColor: `${th.accent}22`,
                  },
                ]}
                disabled={generating}
                activeOpacity={0.75}
              >
                <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    active && { color: th.accent, fontWeight: '800' },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>SUBJECT / FOCUS (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Neural networks survey, client presentation"
          placeholderTextColor="#94A3B8"
          value={subject}
          onChangeText={setSubject}
          maxLength={80}
          editable={!generating}
        />

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
            disabled={generating}
          />
        </View>

        <Text style={styles.label}>PRIORITY</Text>
        <View style={styles.priorityRow}>
          {['Low', 'Medium', 'High'].map((level) => {
            const active = priority === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => setPriority(level)}
                style={[
                  styles.priorityPill,
                  active && {
                    borderColor: th.accent,
                    backgroundColor: `${th.accent}22`,
                  },
                ]}
                disabled={generating}
              >
                <Text
                  style={[styles.priorityText, active && { color: th.accent }]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
                disabled={generating}
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

        {renderSchedulePreview()}

        {title.length > 0 && !generating && !schedulePreview && (
          <LinearGradient
            colors={th.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <Text style={[styles.previewTitle, { color: th.textLight }]}>
              {title}
            </Text>
            {subject ? (
              <Text style={[styles.previewSubject, { color: th.textLight }]}>
                {subject}
              </Text>
            ) : null}
            {dueDate ? (
              <Text style={[styles.previewDate, { color: th.textLight }]}>
                📅 {formatDate(dueDate)}
              </Text>
            ) : null}
          </LinearGradient>
        )}

        {generating && (
          <View style={styles.generatingBox}>
            <ActivityIndicator size="small" color={th.accent} />
            <Text style={styles.generatingText}>
              Scheduling your steps…
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          style={styles.saveBtnWrap}
          disabled={generating || !title.trim()}
        >
          <LinearGradient
            colors={[th.accent, th.cardGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.saveBtn,
              (generating || !title.trim()) && { opacity: 0.6 },
            ]}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Sparkles color="#fff" size={18} />
            )}
            <Text style={styles.saveBtnText}>
              {generating
                ? 'Scheduling…'
                : isEdit
                ? 'Save Changes'
                : 'Save & Schedule'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleClose}
          style={styles.cancelBtn}
          disabled={generating}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export default AddTaskBottomSheet;

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#1E293B', borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 24 },
  handle: { backgroundColor: '#475569', width: 40 },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 4 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.3 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1.2, marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, fontSize: 15, color: '#F1F5F9', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 52 },
  rowInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: 52, gap: 10, marginBottom: 8 },
  flexInput: { flex: 1, color: '#F1F5F9', fontSize: 15 },
  helperText: { fontSize: 12, color: '#64748B', marginBottom: 18, lineHeight: 16, fontStyle: 'italic' },
  categoryRow: { gap: 8, paddingBottom: 22, paddingRight: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.04)' },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { color: '#CBD5E1', fontWeight: '700', fontSize: 13 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 24 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { color: '#E2E8F0', fontWeight: '700', fontSize: 14 },
  toggleSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  priorityPill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center' },
  priorityText: { color: '#CBD5E1', fontWeight: '700', fontSize: 13 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 10, marginBottom: 20 },
  dotWrapper: { padding: 4 },
  themeDot: { width: 40, height: 40, borderRadius: 20 },
  previewCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  previewTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  previewSubject: { fontSize: 13, opacity: 0.85, marginBottom: 6, fontStyle: 'italic' },
  previewDate: { fontSize: 13, opacity: 0.82, fontWeight: '500' },
  previewScheduleWrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  scheduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  scheduleTitle: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  scheduleDate: { color: '#64748B', fontSize: 11, marginTop: 2, fontWeight: '500' },
  generatingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 20 },
  generatingText: { color: '#CBD5E1', fontSize: 14, fontWeight: '600' },
  saveBtnWrap: { borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 18 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
});