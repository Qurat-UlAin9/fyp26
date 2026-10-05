// src/utils/reminders.js
//
// Task reminders + habit nudges. Native-only; silently no-ops on web.
// Tasks: one-time trigger at (due_date - 1h), or 9am on due date if date-only.
// Habits: repeating daily trigger, 30 min before each time slot ends.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ============================================================
// Shared setup
// ============================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensurePermission() {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(requested.granted);
}

// ============================================================
// HABIT NUDGES (repeating daily)
// ============================================================

const SLOT_END = {
  Morning: 11,   // nudge fires at 10:30
  Noon: 14,      // nudge fires at 13:30
  Evening: 20,   // nudge fires at 19:30
  Night: 23,     // nudge fires at 22:30
};

const NUDGE_OFFSET_MIN = 30;

export async function scheduleHabitNudges(habit) {
  if (Platform.OS === 'web') return [];
  if (!habit?.id || !Array.isArray(habit.timeSlots)) return [];

  const ok = await ensurePermission();
  if (!ok) return [];

  // Wipe any existing nudges for this habit first
  await cancelHabitNudges(habit.id);

  const scheduled = [];

  for (const slot of habit.timeSlots) {
    const endHour = SLOT_END[slot];
    if (!endHour) continue;

    let nudgeHour = endHour;
    let nudgeMinute = -NUDGE_OFFSET_MIN;
    if (nudgeMinute < 0) {
      nudgeMinute += 60;
      nudgeHour -= 1;
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${slot} check-in`,
          body: `Did you get to "${habit.name}"?`,
          data: { habitId: habit.id, slot, kind: 'habit-nudge' },
        },
        trigger: {
          hour: nudgeHour,
          minute: nudgeMinute,
          repeats: true,
        },
      });
      scheduled.push(id);
    } catch (err) {
      console.warn('scheduleHabitNudges failed for slot', slot, err?.message);
    }
  }

  return scheduled;
}

export async function cancelHabitNudges(habitId) {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const mine = all.filter((n) => n.content?.data?.habitId === habitId);
    for (const n of mine) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch (err) {
    console.warn('cancelHabitNudges failed:', err?.message);
  }
}

// ============================================================
// TASK REMINDERS (one-time, at due date)
// ============================================================

// Work out the exact moment the reminder should fire.
// - If dueDate includes a time (ISO with T), fire 1 hour before.
// - If date-only, fire at 09:00 on that date.
// - If in the past, return null (skip scheduling).
function resolveTaskFireDate(dueDate) {
  if (!dueDate) return null;

  const raw = String(dueDate);

  // Date-only string like "2026-10-12"
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T09:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Full ISO with time
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;

  const oneHourBefore = new Date(d.getTime() - 60 * 60 * 1000);
  return oneHourBefore;
}

export async function scheduleTaskReminder(task) {
  if (Platform.OS === 'web') return null;
  if (!task?.id || !task?.dueDate) return null;

  const fireAt = resolveTaskFireDate(task.dueDate);
  if (!fireAt) return null;
  if (fireAt.getTime() <= Date.now()) return null;

  const ok = await ensurePermission();
  if (!ok) return null;

  // Wipe any existing reminder for this task first
  await cancelTaskReminder(task.id);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task reminder',
        body: task.title || 'You have a task coming up.',
        data: { taskId: task.id, kind: 'task-reminder' },
      },
      trigger: fireAt,
    });
    return id;
  } catch (err) {
    console.warn('scheduleTaskReminder failed:', err?.message);
    return null;
  }
}

export async function cancelTaskReminder(taskId) {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const mine = all.filter((n) => n.content?.data?.taskId === taskId);
    for (const n of mine) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch (err) {
    console.warn('cancelTaskReminder failed:', err?.message);
  }
}