// src/utils/reminders.js
//
// Task reminders + habit nudges. Native-only; silently no-ops on web.
// Tasks: one-time trigger at (due_date - 1h), or 9am on due date if date-only.
// Habits: repeating daily trigger, 30 min before each time slot ends.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CATEGORY_HABIT, CATEGORY_TASK, CHANNEL_ID, ensureAndroidChannel } from './notificationSetup';

const T = Notifications.SchedulableTriggerInputTypes;
const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ============================================================
// Shared setup
// ============================================================

Notifications.setNotificationHandler({
  // SDK 54+ names: banner (pop-up while the app is open) and list (notification centre)
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission() {
  if (Platform.OS === 'web') return false;
  await ensureAndroidChannel().catch(() => {});

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

  for (const [slotIndex, slot] of habit.timeSlots.entries()) {
    let nudgeHour;
    let nudgeMinute;

    // Exact time ("07:30"): nudge 15 minutes after it, if the habit was not ticked yet
    const exact = /^(\d{1,2}):(\d{2})$/.exec(String(habit.slotTimes?.[slot] || ''));
    if (exact) {
      const total = Number(exact[1]) * 60 + Number(exact[2]) + 15;
      nudgeHour = Math.floor(total / 60) % 24;
      nudgeMinute = total % 60;
    } else {
      const endHour = SLOT_END[slot];
      if (!endHour) continue;
      nudgeHour = endHour;
      nudgeMinute = -NUDGE_OFFSET_MIN;
      if (nudgeMinute < 0) {
        nudgeMinute += 60;
        nudgeHour -= 1;
      }
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${slot} check-in`,
          body: `Did you get to "${habit.name}"?`,
          categoryIdentifier: CATEGORY_HABIT, // gives the Did it / Later / Skip buttons
          data: { habitId: habit.id, slot, slotIndex, kind: 'habit-nudge' },
        },
        trigger: {
          type: T.DAILY,
          hour: nudgeHour,
          minute: nudgeMinute,
          channelId: CHANNEL_ID,
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
        categoryIdentifier: CATEGORY_TASK,
        data: { taskId: task.id, kind: 'task-nudge', source: 'due' },
      },
      trigger: { type: T.DATE, date: fireAt, channelId: CHANNEL_ID },
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

// ============================================================
// STEP REMINDERS (one per planned step, at its start time)
// ============================================================

const MAX_STEP_REMINDERS = 20; // phones limit pending notifications (iOS: 64 in total)

export async function cancelStepReminders(taskId) {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const d = n.content?.data || {};
      if (d.kind === 'step-reminder' && d.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (err) {
    console.warn('cancelStepReminders failed:', err?.message);
  }
}

/** Remind the user when each unfinished, planned step of a task is due to start. */
export async function scheduleStepReminders(task) {
  if (Platform.OS === 'web' || !task?.id) return 0;
  const steps = (Array.isArray(task.subtasks) ? task.subtasks : []).filter(
    (s) => !s.done && s.scheduledDate && s.scheduledHour != null
  );
  await cancelStepReminders(task.id);
  if (!steps.length) return 0;
  if (!(await ensurePermission())) return 0;

  let count = 0;
  for (const step of steps) {
    if (count >= MAX_STEP_REMINDERS) break;
    const [y, m, d] = String(step.scheduledDate).split('-').map(Number);
    const hour = Number(step.scheduledHour);
    const when = new Date(y, m - 1, d, Math.floor(hour), Math.round((hour % 1) * 60), 0);
    if (when.getTime() <= Date.now() + 30 * 1000) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for: ${step.title}`,
          body: `${task.title}${step.durationMins ? ` · ${step.durationMins} min` : ''}`,
          categoryIdentifier: CATEGORY_TASK,
          data: { taskId: task.id, subtaskId: step.id, kind: 'step-reminder' },
        },
        trigger: { type: T.DATE, date: when, channelId: CHANNEL_ID },
      });
      count += 1;
    } catch (err) {
      console.warn('step reminder failed:', err?.message);
    }
  }
  return count;
}

// ============================================================
// TESTING HELPERS (used by Settings → Test notifications)
// ============================================================

export async function sendTestNotification(kind = 'basic', seconds = 5) {
  if (Platform.OS === 'web') return { ok: false, reason: 'Notifications do not run on web.' };
  const granted = await ensurePermission();
  if (!granted) return { ok: false, reason: 'Notification permission is off. Turn it on in the phone settings for this app.' };

  const content =
    kind === 'habit'
      ? {
          title: 'Morning check-in',
          body: 'Did you get to "Test habit"? (long-press to see the buttons)',
          categoryIdentifier: CATEGORY_HABIT,
          data: { kind: 'habit-nudge', habitId: '__test__', slotIndex: 0, slot: 'Morning' },
        }
      : kind === 'task'
        ? {
            title: 'Time for: Test step',
            body: 'Test task · 10 min',
            categoryIdentifier: CATEGORY_TASK,
            data: { kind: 'task-nudge', taskId: '__test__' },
          }
        : { title: 'Test notification', body: 'If you can read this, reminders work on this phone.', data: { kind: 'test' } };

  await Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: T.TIME_INTERVAL, seconds, channelId: CHANNEL_ID },
  });
  return { ok: true, reason: `Arrives in ${seconds} seconds. Lock the phone or leave the app to see it as a real notification.` };
}

export async function describeScheduled() {
  if (Platform.OS === 'web') return [];
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.map((n) => ({
    id: n.identifier,
    title: n.content?.title,
    kind: n.content?.data?.kind,
    trigger: n.trigger,
  }));
}
