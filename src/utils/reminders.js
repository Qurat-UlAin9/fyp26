import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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

export function reminderDateFromDue(dueDate) {
  if (!dueDate) return null;
  const date = new Date(`${dueDate}T09:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function scheduleTaskReminder({ title, dueDate, reminderAt }) {
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
