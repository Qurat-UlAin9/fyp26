import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';

import { ThemeProvider } from './src/contexts/ThemeContext';
import { AppDataProvider, useAppData } from './src/contexts/AppDataContext';
import { ProductivityProvider } from './src/contexts/ProductivityContext';
import AppNavigator from './src/navigation/AppNavigator';
import { toastConfig } from './src/utils/toastConfig';
import {
  registerNotificationCategories,
  attachNotificationResponseListener,
} from './src/utils/notificationSetup';
import { registerBackgroundCheck } from './src/utils/backgroundCheck';

// Small effect component so we can use useAppData() inside the provider
function NotificationBridge() {
  const { habits, tasks, updateHabit, updateTask } = useAppData();
  const detachRef = useRef(null);

  useEffect(() => {
    registerNotificationCategories().catch(() => {});
    registerBackgroundCheck().catch(() => {});

    const detach = attachNotificationResponseListener({
      'did-it': async (data) => {
        if (data.kind !== 'habit-nudge') return;
        const { habitId, slotIndex } = data;
        const habit = habits.find((h) => h.id === habitId);
        if (!habit) return;

        const updated = [...habit.completions];
        updated[slotIndex] = true;

        await updateHabit(habitId, (prev) => ({
          ...prev,
          completions: updated,
          metadata: {
            ...(prev.metadata || {}),
            completions: updated,
            lastCompletionDate: new Date().toISOString().slice(0, 10),
          },
        }));
      },

      'later': async (data) => {
        if (data.kind !== 'habit-nudge') return;
        // Snooze: re-fire in 30 minutes
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Snoozed habit',
            body: 'Quick check-in — did you get to it?',
            categoryIdentifier: 'habit-nudge',
            data,
          },
          trigger: { seconds: 30 * 60 },
        });
      },

      'skip': async () => {
        // Nothing to do; user dismissed for today. Cooldown prevents re-nudge.
      },

      'starting': async (data) => {
        if (data.kind !== 'task-nudge') return;
        const { taskId } = data;
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;
        await updateTask(taskId, (prev) => ({
          ...prev,
          status: 'In Progress',
        }));
      },

      'reschedule': async () => {
        // opensAppToForeground:true means the app is opening anyway.
        // The ChatbotScreen or Tasks screen will be reached manually.
      },

      'not-now': async (data) => {
        if (data.kind !== 'task-nudge') return;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Task reminder',
            body: 'Still on your list — want to tackle it soon?',
            categoryIdentifier: 'task-nudge',
            data,
          },
          trigger: { seconds: 60 * 60 }, // 1 hour
        });
      },
    });

    detachRef.current = detach;
    return () => {
      if (detachRef.current) detachRef.current();
    };
  }, [habits, tasks, updateHabit, updateTask]);

  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppDataProvider>
            <ProductivityProvider>
              <NavigationContainer>
                <AppNavigator />
                <NotificationBridge />
              </NavigationContainer>
              <Toast
                config={toastConfig}
                position="top"
                topOffset={60}
                visibilityTime={2200}
              />
            </ProductivityProvider>
          </AppDataProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}