import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled_v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return Boolean(requested.granted);
}

export async function getNotificationsEnabled() {
  const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return value === null ? true : value === 'true';
}

export async function setNotificationsEnabled(enabled) {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(Boolean(enabled)));
  if (!enabled && Platform.OS !== 'web') {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export async function cancelAllTaskReminders() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function reminderDateFromDue(dueDate) {
  if (!dueDate) return null;
  const date = new Date(`${dueDate}T09:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function scheduleTaskReminder({ title, dueDate, reminderAt }) {
  if (!(await getNotificationsEnabled())) return null;
  const triggerDate = reminderAt ? new Date(reminderAt) : reminderDateFromDue(dueDate);
  if (!triggerDate || triggerDate.getTime() <= Date.now()) return null;

  const allowed = await ensureNotificationPermission();
  if (!allowed) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task reminder',
        body: title || 'You have a task coming up.',
      },
      trigger: triggerDate,
    });
  } catch {
    return null;
  }
}

export async function cancelTaskReminder(identifier) {
  if (!identifier || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The notification may already have fired or been removed by the OS.
  }
}
