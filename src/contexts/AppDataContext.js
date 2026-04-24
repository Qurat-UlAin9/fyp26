/**
 * AppDataContext.js
 *
 * Single source of truth for tasks, habits, and focus sessions.
 * Wrap this around your navigator in App.js (inside ThemeProvider).
 *
 * App.js usage:
 *   import { AppDataProvider } from './src/contexts/AppDataContext';
 *
 *   <ThemeProvider>
 *     <AppDataProvider>          ← add this
 *       <ProductivityProvider>
 *         <NavigationContainer>
 *           <AppNavigator />
 *         </NavigationContainer>
 *       </ProductivityProvider>
 *     </AppDataProvider>         ← and this
 *   </ThemeProvider>
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Maps a CARD_THEMES themeId string to the colorIdx used by TimelineScreen.
 * Extend this if you add more themes.
 */
const THEME_TO_COLOR_IDX = {
  coral   : 0,
  sky     : 5,
  mint    : 3,
  lavender: 9,
  teal    : 1,
};

/**
 * Maps a habit COLOR_OPTIONS id to a colorIdx for TimelineScreen.
 */
const HABIT_COLOR_TO_IDX = {
  coral : 0,
  blue  : 5,
  green : 3,
  purple: 9,
  teal  : 1,
};

/**
 * Maps a time-slot label to an approximate startHour for the timeline.
 * These are the midpoints — adjust to taste.
 */
const SLOT_TO_HOUR = {
  Morning: 7,
  Noon   : 12,
  Evening: 18,
  Night  : 21,
};

const SLOT_DURATION_MINS = 30; // how long each habit slot appears on timeline

// ─── Context ──────────────────────────────────────────────────────────────────

const AppDataContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }) {

  // ── Tasks ──────────────────────────────────────────────────────────────────
  // Shape matches exactly what AddTaskBottomSheet.onSubmit produces:
  // { id, title, dueDate, themeId, notifEnabled, startHour, endHour,
  //   expanded, completedRewarded, completedAt, subtasks: [{id, title, done}] }
  const [tasks, setTasks] = useState([]);

  const addTask = useCallback((taskObj) => {
    // taskObj comes straight from AddTaskBottomSheet onSubmit — no transformation needed
    setTasks((prev) => [taskObj, ...prev]);
  }, []);

  const updateTask = useCallback((taskId, updater) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updater(t) : t))
    );
  }, []);

  const deleteTask = useCallback((taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const toggleSubtask = useCallback((taskId, subtaskId) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const target = task.subtasks.find((s) => s.id === subtaskId);
        if (!target || target.done) return task; // already done
        return {
          ...task,
          subtasks: task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, done: true } : s
          ),
        };
      })
    );
  }, []);

  // ── Habits ─────────────────────────────────────────────────────────────────
  // Shape matches exactly what AddHabitBottomSheet.onSubmit produces:
  // { id, name, timeSlots, completions, gradient, reminder }
  const [habits, setHabits] = useState([]);

  const addHabit = useCallback((habitObj) => {
    setHabits((prev) => [...prev, habitObj]);
  }, []);

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

  const deleteHabit = useCallback((habitId) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  }, []);

  // ── Focus sessions ─────────────────────────────────────────────────────────
  // Shape: { id, taskId, taskTitle, isoKey, startHour, startMin, durationMins }
  const [focusSessions, setFocusSessions] = useState([]);

  const addFocusSession = useCallback((session) => {
    setFocusSessions((prev) => [
      {
        id          : Date.now().toString(),
        startMin    : 0,
        durationMins: 25,
        isoKey      : todayISO(),
        ...session,
      },
      ...prev,
    ]);
  }, []);

  const deleteFocusSession = useCallback((sessionId) => {
    setFocusSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  // ── Timeline events (derived) ──────────────────────────────────────────────
  // TimelineScreen consumes this single merged array.
  // Shape per item: { id, title, type, isoKey, startHour, startMin, durationMins, colorIdx }
  const timelineEvents = useMemo(() => {
    const events = [];

    // — Tasks → one event per task on its dueDate
    tasks.forEach((task) => {
      const startHour = parseInt(task.startHour, 10) || 9;
      const endHour   = parseInt(task.endHour,   10) || 11;
      events.push({
        id          : `task-${task.id}`,
        title       : task.title,
        type        : 'task',
        isoKey      : task.dueDate || todayISO(),
        startHour,
        startMin    : 0,
        durationMins: Math.max(30, (endHour - startHour) * 60),
        colorIdx    : THEME_TO_COLOR_IDX[task.themeId] ?? 0,
      });
    });

    // — Habits → one event per selected time-slot, repeated for today's date
    //   (expand to recurring logic later if needed)
    const today = todayISO();
    habits.forEach((habit) => {
      // Derive colorIdx from the first color in the gradient array
      const gradientFirst = (habit.gradient?.[0] || '').toLowerCase();
      let colorIdx = 1; // teal default
      if (gradientFirst.includes('ff9a') || gradientFirst.includes('ff6a')) colorIdx = HABIT_COLOR_TO_IDX.coral;
      else if (gradientFirst.includes('5dae') || gradientFirst.includes('3a8d')) colorIdx = HABIT_COLOR_TO_IDX.blue;
      else if (gradientFirst.includes('6ee7') || gradientFirst.includes('34d3')) colorIdx = HABIT_COLOR_TO_IDX.green;
      else if (gradientFirst.includes('a78b') || gradientFirst.includes('7c3a')) colorIdx = HABIT_COLOR_TO_IDX.purple;
      else if (gradientFirst.includes('4fd1') || gradientFirst.includes('2cb1')) colorIdx = HABIT_COLOR_TO_IDX.teal;

      habit.timeSlots.forEach((slot, idx) => {
        events.push({
          id          : `habit-${habit.id}-${idx}`,
          title       : habit.name,
          type        : 'habit',
          isoKey      : today,
          startHour   : SLOT_TO_HOUR[slot] ?? 8,
          startMin    : 0,
          durationMins: SLOT_DURATION_MINS,
          colorIdx,
        });
      });
    });

    // — Focus sessions → direct mapping
    focusSessions.forEach((session) => {
      events.push({
        id          : `focus-${session.id}`,
        title       : session.taskTitle ? `Focus: ${session.taskTitle}` : 'Focus Session',
        type        : 'focus',
        isoKey      : session.isoKey,
        startHour   : session.startHour,
        startMin    : session.startMin   ?? 0,
        durationMins: session.durationMins ?? 25,
        colorIdx    : 2, // purple-pink = focus color
      });
    });

    return events;
  }, [tasks, habits, focusSessions]);

  // ─── Context value ──────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    // Tasks
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleSubtask,

    // Habits
    habits,
    addHabit,
    toggleHabitSlot,
    deleteHabit,

    // Focus
    focusSessions,
    addFocusSession,
    deleteFocusSession,

    // Timeline (derived, read-only)
    timelineEvents,
  }), [
    tasks, addTask, updateTask, deleteTask, toggleSubtask,
    habits, addHabit, toggleHabitSlot, deleteHabit,
    focusSessions, addFocusSession, deleteFocusSession,
    timelineEvents,
  ]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}