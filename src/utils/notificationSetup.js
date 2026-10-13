// src/utils/notificationSetup.js
//
// Registers notification categories (action buttons) and handles user
// responses without opening the app. Called once from App.js on mount.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const CATEGORY_HABIT = 'habit-nudge';
export const CATEGORY_TASK = 'task-nudge';

export async function registerNotificationCategories() {
  if (Platform.OS === 'web') return;

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

        // Fire the matching handler
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