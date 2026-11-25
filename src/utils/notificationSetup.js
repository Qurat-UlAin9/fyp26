// src/utils/notificationSetup.js
//
// Registers notification categories (action buttons) and handles user
// responses without opening the app. Called once from App.js on mount.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const CATEGORY_HABIT = 'habit-nudge';
export const CATEGORY_TASK = 'task-nudge';

export const CHANNEL_ID = 'default';

// Android 8+ needs a channel before anything can be shown (and Android 13+ only asks for permission
// once one exists). Safe to call every launch.
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders & nudges',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function registerNotificationCategories() {
  if (Platform.OS === 'web') return;
  await ensureAndroidChannel();

  await Notifications.setNotificationCategoryAsync(CATEGORY_HABIT, [
    {
      identifier: 'did-it',
      buttonTitle: 'Did it',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'later',
      buttonTitle: 'Later',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'skip',
      buttonTitle: 'Skip today',
      options: { opensAppToForeground: false },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(CATEGORY_TASK, [
    {
      identifier: 'starting',
      buttonTitle: 'Starting now',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'reschedule',
      buttonTitle: 'Reschedule',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'not-now',
      buttonTitle: 'Not now',
      options: { opensAppToForeground: false },
    },
  ]);
}

// Called by App.js with a handler map for each action.
// The handler map looks like:
//   { 'did-it': (data) => {...}, 'later': (data) => {...}, ... }
// Handlers receive the notification's `data` payload and the action identifier.
export function attachNotificationResponseListener(handlers) {
  if (Platform.OS === 'web') return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      try {
        const { actionIdentifier, notification } = response;
        const data = notification?.request?.content?.data || {};

        // Fire the matching handler (a plain tap on the notification is DEFAULT_ACTION_IDENTIFIER)
        const handler = handlers[actionIdentifier];
        if (handler) {
          await handler(data);
        }
      } catch (err) {
        console.warn('Notification response handler failed:', err?.message);
      }
    }
  );

  return () => subscription.remove();
}

// The app was closed when the notification was tapped: handle that tap once the app is up
export async function consumeLastNotificationResponse(handlers) {
  if (Platform.OS === 'web') return;
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    if (!last) return;
    const handler = handlers[last.actionIdentifier];
    if (handler) await handler(last.notification?.request?.content?.data || {});
  } catch (err) {
    console.warn('last notification response failed:', err?.message);
  }
}
