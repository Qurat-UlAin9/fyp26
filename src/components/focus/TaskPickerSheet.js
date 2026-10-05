import React, { forwardRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Check, X, ListChecks } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export default function TaskPickerSheet({
  sheetRef,
  tasks,
  selectedTaskId,
  onSelectTask,
  onClearTask,
}) {
  const { isDark } = useTheme();
  const snapPoints = useMemo(() => ['70%'], []);

  const openTasks = tasks.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Cancelled'
  );

  const sheetBg = isDark ? '#0A1628' : '#F8FAFF';

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={[styles.sheetBackground, { backgroundColor: sheetBg }]}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <ListChecks size={18} color="#38BDF8" />
            </View>
            <View>
              <Text style={[styles.title, { color: isDark ? '#E0F2FE' : '#0F172A' }]}>
                Pick a task
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? '#475569' : '#94A3B8' }]}>
                Focus will be linked to this
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => sheetRef.current?.close()}
            style={styles.closeBtn}
          >
            <X size={16} color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>
        </View>

        {/* No-task option */}
        <TouchableOpacity
          onPress={() => {
            onClearTask?.();
            sheetRef.current?.close();
          }}
          style={[
            styles.taskRow,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderColor: !selectedTaskId
                ? '#38BDF8'
                : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(15,23,42,0.08)',
            },
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.taskText}>
            <Text style={[styles.taskTitle, { color: isDark ? '#CBD5E1' : '#1E293B' }]}>
              No task — just focus
            </Text>
            <Text style={[styles.taskSub, { color: isDark ? '#475569' : '#94A3B8' }]}>
              Timer without a linked task
            </Text>
          </View>
          {!selectedTaskId && <Check size={18} color="#38BDF8" />}
        </TouchableOpacity>

        {openTasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: isDark ? '#475569' : '#94A3B8' }]}>
              No open tasks. Create one from the Tasks tab.
            </Text>
          </View>
        ) : (
          openTasks.map((task) => {
            const active = selectedTaskId === task.id;
            return (
              <TouchableOpacity
                key={task.id}
                onPress={() => {
                  onSelectTask?.(task);
                  sheetRef.current?.close();
                }}
                style={[
                  styles.taskRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                    borderColor: active
                      ? '#38BDF8'
                      : isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(15,23,42,0.08)',
                  },
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.taskText}>
                  <Text
                    style={[styles.taskTitle, { color: isDark ? '#E0F2FE' : '#1E293B' }]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <Text style={[styles.taskSub, { color: isDark ? '#475569' : '#94A3B8' }]}>
                    {task.category ? `${task.category} · ` : ''}
                    {task.subtasks?.length || 0} subtasks · {task.priority}
                  </Text>
                </View>
                {active && <Check size={18} color="#38BDF8" />}
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: '#475569',
  },
  content: { paddingHorizontal: 20, paddingTop: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148,163,184,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  taskText: { flex: 1, marginRight: 12 },
  taskTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  taskSub: { fontSize: 12, marginTop: 3 },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});