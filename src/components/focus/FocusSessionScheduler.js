import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppData } from '../../contexts/AppDataContext';

const TRIGGER_WINDOW_MINS = 5;
const DEFAULT_DURATION_MINS = 25;
const POLL_INTERVAL_MS = 60000;

function SessionPromptModal({ visible, task, onStart, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!task) return null;

  const startHour = parseInt(task.startHour, 10) || 9;
  const endHour = parseInt(task.endHour, 10) || startHour + 1;

  function fmt(h) {
    var suffix = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':00 ' + suffix;
  }

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={['#667EEA', '#764BA2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentBar}
          />

          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>⏰</Text>
          </View>

          <Text style={styles.heading}>Time to Focus!</Text>

          <Text style={styles.taskName} numberOfLines={2}>
            {task.title}
          </Text>

          <Text style={styles.timeLabel}>
            {fmt(startHour)} - {fmt(endHour)}
          </Text>

          <Text style={styles.body}>
            Your scheduled session is starting now.{'\n'}
            Ready for a {DEFAULT_DURATION_MINS}-minute focus block?
          </Text>

          {task.subtasks && task.subtasks.length > 0 && (
            <View style={styles.subtaskPreview}>
              {task.subtasks.slice(0, 3).map(function(s, i) {
                return (
                  <View key={s.id || i} style={styles.subtaskRow}>
                    <View
                      style={[
                        styles.subtaskDot,
                        s.done && styles.subtaskDotDone,
                      ]}
                    />
                    <Text
                      style={[
                        styles.subtaskText,
                        s.done && styles.subtaskTextDone,
                      ]}
                      numberOfLines={1}
                    >
                      {s.title}
                    </Text>
                  </View>
                );
              })}
              {task.subtasks.length > 3 && (
                <Text style={styles.moreText}>
                  +{task.subtasks.length - 3} more
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={onStart}
            activeOpacity={0.85}
            style={styles.startBtnWrapper}
          >
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>Start Focus Session</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Not right now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function FocusSessionScheduler({ navigation, navigationRef }) {
  const { tasks, addFocusSession } = useAppData();

  const [promptTask, setPromptTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const dismissedRef = useRef(new Set());

  var navigate = useCallback(
    function(screen, params) {
      if (navigation) {
        navigation.navigate(screen, params);
      } else if (
        navigationRef &&
        navigationRef.current &&
        navigationRef.current.isReady &&
        navigationRef.current.isReady()
      ) {
        navigationRef.current.navigate(screen, params);
      }
    },
    [navigation, navigationRef]
  );

  var checkTasks = useCallback(
    function() {
      var now = new Date();
      var currentMins = now.getHours() * 60 + now.getMinutes();
      var todayISO = now.toISOString().slice(0, 10);

      for (var i = 0; i < tasks.length; i++) {
        var task = tasks[i];
        if (dismissedRef.current.has(task.id)) continue;
        if (task.dueDate !== todayISO) continue;

        var startHour = parseInt(task.startHour, 10);
        if (isNaN(startHour)) continue;

        var diff = startHour * 60 - currentMins;
        if (diff >= 0 && diff <= TRIGGER_WINDOW_MINS) {
          dismissedRef.current.add(task.id);
          setPromptTask(task);
          setModalVisible(true);
          break;
        }
      }
    },
    [tasks]
  );

  useEffect(
    function() {
      checkTasks();
      var id = setInterval(checkTasks, POLL_INTERVAL_MS);
      return function() {
        clearInterval(id);
      };
    },
    [checkTasks]
  );

  var handleStart = useCallback(
    function() {
      if (!promptTask) return;
      setModalVisible(false);
      var now = new Date();
      addFocusSession({
        taskId: promptTask.id,
        taskTitle: promptTask.title,
        isoKey: now.toISOString().slice(0, 10),
        startHour: now.getHours(),
        startMin: now.getMinutes(),
        durationMins: DEFAULT_DURATION_MINS,
      });
      navigate('Focus', { task: promptTask });
    },
    [promptTask, addFocusSession, navigate]
  );

  var handleDismiss = useCallback(function() {
    setModalVisible(false);
    setPromptTask(null);
  }, []);

  return (
    <SessionPromptModal
      visible={modalVisible}
      task={promptTask}
      onStart={handleStart}
      onDismiss={handleDismiss}
    />
  );
}

var styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  accentBar: {
    width: '100%',
    height: 5,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0EFFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  iconEmoji: { fontSize: 36 },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  taskName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667EEA',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  subtaskPreview: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 18,
    gap: 8,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  subtaskDotDone: { backgroundColor: '#667EEA' },
  subtaskText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  subtaskTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  moreText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    paddingLeft: 18,
  },
  startBtnWrapper: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dismissBtn: { paddingVertical: 8 },
  dismissText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});