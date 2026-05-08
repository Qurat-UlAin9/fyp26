import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_DATA_KEY = 'adhd_app_data_v1';
const todayISO = () => new Date().toISOString().slice(0, 10);

const THEME_TO_COLOR_IDX = { coral: 0, sky: 5, mint: 3, lavender: 9, teal: 1 };
const HABIT_COLOR_TO_IDX = { coral: 0, blue: 5, green: 3, purple: 9, teal: 1 };
const SLOT_TO_HOUR = { Morning: 7, Noon: 12, Evening: 18, Night: 21 };
const SLOT_DURATION_MINS = 30;

const defaultProfile = {
  name: 'Friend',
  email: '',
  avatarEmoji: '🧠',
  adhdScreening: 'Not completed yet',
  mood: 'Calm',
};
const defaultHabitStats = {
  streakDays: 0,
  dailyTarget: 0,
  todayDone: 0,
  rollingThreeDayTarget: 0,
  rollingThreeDayDone: 0,
};

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [focusSessions, setFocusSessions] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [profile, setProfile] = useState(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const raw = await AsyncStorage.getItem(APP_DATA_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setTasks(Array.isArray(parsed.tasks) ? parsed.tasks : []);
        setHabits(Array.isArray(parsed.habits) ? parsed.habits : []);
        setFocusSessions(Array.isArray(parsed.focusSessions) ? parsed.focusSessions : []);
        setTaskHistory(Array.isArray(parsed.taskHistory) ? parsed.taskHistory : []);
        setProfile({ ...defaultProfile, ...(parsed.profile || {}) });
      } catch (e) {
        console.warn('Failed to hydrate app data', e);
      } finally {
        setHydrated(true);
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(APP_DATA_KEY, JSON.stringify({ tasks, habits, focusSessions, taskHistory, profile })).catch(() => undefined);
  }, [tasks, habits, focusSessions, taskHistory, profile, hydrated]);

  const addTask = useCallback((taskObj) => {
    setTasks((prev) => [taskObj, ...prev]);

    const hour = Number.parseInt(taskObj.startHour, 10);
    if (!Number.isNaN(hour)) {
      setFocusSessions((prev) => [
        {
          id: `${Date.now()}-task-focus-${taskObj.id}`,
          taskId: taskObj.id,
          taskTitle: taskObj.title,
          isoKey: taskObj.dueDate || todayISO(),
          startHour: hour,
          startMin: 0,
          durationMins: Math.max(25, (Number.parseInt(taskObj.endHour, 10) - hour) * 60 || 25),
        },
        ...prev,
      ]);
    }
  }, []);

  const updateTask = useCallback((taskId, updater) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updater(t) : t)));
  }, []);
  const deleteTask = useCallback((taskId) => setTasks((prev) => prev.filter((t) => t.id !== taskId)), []);

  const toggleSubtask = useCallback((taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const target = task.subtasks.find((s) => s.id === subtaskId);
        if (!target || target.done) return task;
        return { ...task, subtasks: task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: true } : s)) };
      })
    );
  }, []);

  const addHabit = useCallback((habitObj) => setHabits((prev) => [...prev, habitObj]), []);
  const toggleHabitSlot = useCallback((habitId, slotIndex) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const updated = [...h.completions];
        updated[slotIndex] = !updated[slotIndex];
        return { ...h, completions: updated };
      })
    );
  }, []);
  const deleteHabit = useCallback((habitId) => setHabits((prev) => prev.filter((h) => h.id !== habitId)), []);

  const addFocusSession = useCallback((session) => {
    setFocusSessions((prev) => [{ id: Date.now().toString(), startMin: 0, durationMins: 25, isoKey: todayISO(), ...session }, ...prev]);
  }, []);
  const deleteFocusSession = useCallback((sessionId) => setFocusSessions((prev) => prev.filter((s) => s.id !== sessionId)), []);
  const addTaskToHistory = useCallback((task) => {
    setTaskHistory((prev) => [{ ...task, completedAt: task.completedAt || new Date().toISOString() }, ...prev].slice(0, 100));
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  const timelineEvents = useMemo(() => {
    const events = [];
    tasks.forEach((task) => {
      const startHour = parseInt(task.startHour, 10) || 9;
      const endHour = parseInt(task.endHour, 10) || 11;
      events.push({
        id: `task-${task.id}`,
        title: task.title,
        type: 'task',
        isoKey: task.dueDate || todayISO(),
        startHour,
        startMin: 0,
        durationMins: Math.max(30, (endHour - startHour) * 60),
        colorIdx: THEME_TO_COLOR_IDX[task.themeId] ?? 0,
      });
    });

    const today = todayISO();
    habits.forEach((habit) => {
      const gradientFirst = (habit.gradient?.[0] || '').toLowerCase();
      let colorIdx = 1;
      if (gradientFirst.includes('ff9a') || gradientFirst.includes('ff6a')) colorIdx = HABIT_COLOR_TO_IDX.coral;
      else if (gradientFirst.includes('5dae') || gradientFirst.includes('3a8d')) colorIdx = HABIT_COLOR_TO_IDX.blue;
      else if (gradientFirst.includes('6ee7') || gradientFirst.includes('34d3')) colorIdx = HABIT_COLOR_TO_IDX.green;
      else if (gradientFirst.includes('a78b') || gradientFirst.includes('7c3a')) colorIdx = HABIT_COLOR_TO_IDX.purple;
      else if (gradientFirst.includes('4fd1') || gradientFirst.includes('2cb1')) colorIdx = HABIT_COLOR_TO_IDX.teal;

      habit.timeSlots.forEach((slot, idx) => {
        events.push({
          id: `habit-${habit.id}-${idx}`,
          title: habit.name,
          type: 'habit',
          isoKey: today,
          startHour: SLOT_TO_HOUR[slot] ?? 8,
          startMin: 0,
          durationMins: SLOT_DURATION_MINS,
          colorIdx,
        });
      });
    });

    focusSessions.forEach((session) => {
      events.push({
        id: `focus-${session.id}`,
        title: session.taskTitle ? `Focus: ${session.taskTitle}` : 'Focus Session',
        type: 'focus',
        isoKey: session.isoKey,
        startHour: session.startHour,
        startMin: session.startMin ?? 0,
        durationMins: session.durationMins ?? 25,
        colorIdx: 2,
      });
    });

    return events;
  }, [tasks, habits, focusSessions]);

  const habitStats = useMemo(() => {
    const today = todayISO();
    const slotsPerDay = habits.reduce((acc, habit) => acc + (habit.timeSlots?.length || 0), 0);
    const todayDone = habits.reduce((acc, habit) => acc + (habit.completions?.filter(Boolean).length || 0), 0);
    const rollingThreeDayTarget = slotsPerDay * 3;
    const rollingThreeDayDone = todayDone;
    const streakDays = Math.min(3, Math.floor((todayDone / Math.max(1, slotsPerDay)) || 0));
    return {
      ...defaultHabitStats,
      today,
      streakDays,
      dailyTarget: slotsPerDay,
      todayDone,
      rollingThreeDayTarget,
      rollingThreeDayDone,
    };
  }, [habits]);

  const value = useMemo(
    () => ({
      tasks,
      addTask,
      updateTask,
      deleteTask,
      toggleSubtask,
      habits,
      addHabit,
      toggleHabitSlot,
      deleteHabit,
      focusSessions,
      addFocusSession,
      deleteFocusSession,
      taskHistory,
      addTaskToHistory,
      profile,
      updateProfile,
      timelineEvents,
      habitStats,
    }),
    [tasks, addTask, updateTask, deleteTask, toggleSubtask, habits, addHabit, toggleHabitSlot, deleteHabit, focusSessions, addFocusSession, deleteFocusSession, taskHistory, addTaskToHistory, profile, updateProfile, timelineEvents, habitStats]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
