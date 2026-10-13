// src/utils/backgroundCheck.js
//
// Registers a background task that wakes ~hourly, reads the app snapshot
// from AsyncStorage, and fires state-aware nudges for habits and tasks that
// need attention. Uses a cooldown map to avoid repeat nudges.

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TASK_NAME = 'smart-nudge-check';
const SNAPSHOT_KEY = '@bg_snapshot_v1';
const COOLDOWN_KEY = '@bg_cooldown_v1';

// Cooldown: don't re-nudge the same thing within this window
const HABIT_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours per slot
const TASK_COOLDOWN_MS = 6 * 60 * 60 * 1000;  // 6 hours per task

// Slot end times -- nudge fires after these
const SLOT_NUDGE_HOUR = { Morning: 10.5, Noon: 13.5, Evening: 19.5, Night: 22.5 };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function hoursNow() {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

async function getCooldowns() {
  try {
    const raw = await AsyncStorage.getItem(COOLDOWN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setCooldown(key) {
  try {
    const map = await getCooldowns();
    map[key] = Date.now();
    await AsyncStorage.setItem(COOLDOWN_KEY, JSON.stringify(map));
  } catch {}
}

function recentlyNudged(cooldowns, key, windowMs) {
  const t = cooldowns[key];
  if (!t) return false;
  return Date.now() - t < windowMs;
}

async function evaluateAndFire() {
  if (Platform.OS === 'web') return BackgroundFetch.BackgroundFetchResult.NoData;

  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  const habits = Array.isArray(snapshot.habits) ? snapshot.habits : [];
  const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
  const cooldowns = await getCooldowns();
  const today = todayISO();
  const hNow = hoursNow();

  let fired = 0;

  // ---- Habits ----
  for (const habit of habits) {
    const slots = habit.timeSlots || [];
    const completions = habit.completions || [];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const nudgeHour = SLOT_NUDGE_HOUR[slot];
      if (!nudgeHour) continue;

      // Not yet time
      if (hNow < nudgeHour) continue;

      // Already done today
      if (completions[i]) continue;

      const cooldownKey = `habit:${habit.id}:${slot}:${today}`;
      if (recentlyNudged(cooldowns, cooldownKey, HABIT_COOLDOWN_MS)) continue;

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${slot} check-in`,
            body: `Did you get to "${habit.name}" today?`,
            categoryIdentifier: 'habit-nudge',
            data: {
              kind: 'habit-nudge',
              habitId: habit.id,
              slotIndex: i,
              slot,
            },
          },
          trigger: null, // fire immediately
        });
        await setCooldown(cooldownKey);
        fired++;
      } catch (err) {
        console.warn('Habit nudge failed:', err?.message);
      }
    }
  }

  // ---- Tasks ----
  for (const task of tasks) {
    if (task.status !== 'Pending') continue;
    if (!task.dueDate) continue;

    const due = new Date(task.dueDate);
    if (isNaN(due.getTime())) continue;

    // Only nudge if due date is in the past or within next 2 hours
    const msUntilDue = due.getTime() - Date.now();
    if (msUntilDue > 2 * 60 * 60 * 1000) continue;

    const cooldownKey = `task:${task.id}:${today}`;
    if (recentlyNudged(cooldowns, cooldownKey, TASK_COOLDOWN_MS)) continue;

    const overdue = msUntilDue < 0;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: overdue ? 'Task overdue' : 'Task coming up',
          body: overdue
            ? `"${task.title}" was due. Still working on it?`
            : `"${task.title}" is due soon.`,
          categoryIdentifier: 'task-nudge',
          data: {
            kind: 'task-nudge',
            taskId: task.id,
          },
        },
        trigger: null,
      });
      await setCooldown(cooldownKey);
      fired++;
    } catch (err) {
      console.warn('Task nudge failed:', err?.message);
    }
  }

  return fired > 0
    ? BackgroundFetch.BackgroundFetchResult.NewData
    : BackgroundFetch.BackgroundFetchResult.NoData;
}

// ---- Task definition ----
if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      return await evaluateAndFire();
    } catch (err) {
      console.warn('Background check failed:', err?.message);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundCheck() {
  if (Platform.OS === 'web') return;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      console.warn('Background fetch not available:', status);
      return;
    }

    const already = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (already) return;

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60, // 1 hour (Android may throttle)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.warn('registerBackgroundCheck failed:', err?.message);
  }
}