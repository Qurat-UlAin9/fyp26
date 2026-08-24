import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createHabit,
  createTask,
  deleteHabitRemote,
  deleteTaskRemote,
  getCurrentUser,
  listHabits,
  listTasks,
  updateHabitRemote,
  updateTaskRemote,
} from '../services/api';

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

const toTaskPayload = (task) => ({
  title: task.title,
  priority: String(task.priority || 'medium').toLowerCase(),
  status: task.status || 'pending',
  due_date: task.dueDate || null,
  metadata: task,
});
const fromTaskPayload = (task) => ({ ...task.metadata, ...task, id: String(task.id), dueDate: task.due_date || task.metadata?.dueDate, themeId: task.metadata?.themeId || 'coral' });
const toHabitPayload = (habit) => ({
  title: habit.name,
  frequency: 'daily',
  active: true,
  color: habit.gradient?.[0],
  metadata: habit,
});
const fromHabitPayload = (habit) => ({ ...habit.metadata, ...habit, id: String(habit.id), name: habit.title, gradient: habit.metadata?.gradient || ['#FF9A8B', '#FF6A88'], timeSlots: habit.metadata?.timeSlots || ['Morning'], completions: habit.metadata?.completions || [false] });

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

  // The device cache keeps the UI usable offline. When a signed-in user opens the
  // app, replace it with their server-owned tasks and habits.
  useEffect(() => {
    if (!hydrated) return;
    getCurrentUser()
      .then(async (user) => {
        if (!user) return null;
        const [taskResponse, habitResponse] = await Promise.all([listTasks(), listHabits()]);
        setTasks((taskResponse.data || []).map(fromTaskPayload));
        setHabits((habitResponse.data || []).map(fromHabitPayload));
      })
      .catch(() => undefined);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(APP_DATA_KEY, JSON.stringify({ tasks, habits, focusSessions, taskHistory, profile })).catch(() => undefined);
  }, [tasks, habits, focusSessions, taskHistory, profile, hydrated]);

  const addTask = useCallback(async (taskObj) => {
    setTasks((prev) => [taskObj, ...prev]);

    try {
      const response = await createTask(toTaskPayload(taskObj));
      const remoteTask = fromTaskPayload(response.data);
      setTasks((prev) => prev.map((task) => (task.id === taskObj.id ? remoteTask : task)));
    } catch (error) {
      console.warn('Task was saved locally and will need syncing later.', error.message);
    }

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
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      const updated = updater(t);
      updateTaskRemote(taskId, toTaskPayload(updated)).catch(() => undefined);
      return updated;
    }));
  }, []);
  const deleteTask = useCallback((taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    deleteTaskRemote(taskId).catch(() => undefined);
  }, []);

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

  const addHabit = useCallback(async (habitObj) => {
    setHabits((prev) => [...prev, habitObj]);
    try {
      const response = await createHabit(toHabitPayload(habitObj));
      const remoteHabit = fromHabitPayload(response.data);
      setHabits((prev) => prev.map((habit) => (habit.id === habitObj.id ? remoteHabit : habit)));
    } catch (error) {
      console.warn('Habit was saved locally and will need syncing later.', error.message);
    }
  }, []);
  const toggleHabitSlot = useCallback((habitId, slotIndex) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const updated = [...h.completions];
        updated[slotIndex] = !updated[slotIndex];
        const nextHabit = { ...h, completions: updated };
        updateHabitRemote(habitId, toHabitPayload(nextHabit)).catch(() => undefined);
        return nextHabit;
      })
    );
  }, []);
  const deleteHabit = useCallback((habitId) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    deleteHabitRemote(habitId).catch(() => undefined);
  }, []);

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
