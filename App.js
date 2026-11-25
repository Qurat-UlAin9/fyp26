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
import CelebrationHost from './src/components/common/CelebrationHost';
import MiniPlayer from './src/components/common/MiniPlayer';
import { navigationRef } from './src/utils/navigationRef';
import { toastConfig } from './src/utils/toastConfig';
import {
  registerNotificationCategories,
  attachNotificationResponseListener,
  consumeLastNotificationResponse,
} from './src/utils/notificationSetup';
import { registerBackgroundCheck } from './src/utils/backgroundCheck';

// Small effect component so we can use useAppData() inside the provider
function NotificationBridge() {
  const { toggleHabitSlot, updateTask } = useAppData();
  // Always read the newest lists/functions; the listener itself is attached once
  const live = useRef({});
  const appData = useAppData();
  live.current = appData;

  useEffect(() => {
    registerNotificationCategories().catch(() => {});
    registerBackgroundCheck().catch(() => {});

    const handlers = {
      // Tapping the notification itself
      [Notifications.DEFAULT_ACTION_IDENTIFIER]: async (data) => {
        if (!navigationRef.isReady()) return;
        if (data.kind === 'habit-nudge') navigationRef.navigate('MainTabs', { screen: 'Habits' });
        else if (data.kind === 'task-nudge' || data.kind === 'step-reminder')
          navigationRef.navigate('MainTabs', { screen: 'Tasks', params: { expandTaskId: data.taskId, _ts: Date.now() } });
      },

      'did-it': async (data) => {
        if (data.kind !== 'habit-nudge') return;
        const habit = live.current.habits?.find((h) => h.id === data.habitId);
        const idx = Number.isInteger(data.slotIndex) ? data.slotIndex : 0;
        if (!habit || habit.completions?.[idx]) return; // unknown habit or already ticked
        await live.current.toggleHabitSlot(data.habitId, idx);
      },

      later: async (data) => {
        if (data.kind !== 'habit-nudge') return;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Snoozed habit',
            body: 'Quick check-in — did you get to it?',
            categoryIdentifier: 'habit-nudge',
            data,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 30 * 60 },
        });
      },

      skip: async () => {},

      starting: async (data) => {
        if (data.kind !== 'task-nudge' && data.kind !== 'step-reminder') return;
        const task = live.current.tasks?.find((t) => t.id === data.taskId);
        if (!task) return;
        await live.current.updateTask(data.taskId, (prev) => ({ ...prev, status: 'In Progress' }));
      },

      // opens the app (opensAppToForeground), then the user lands on Tasks
      reschedule: async (data) => {
        if (navigationRef.isReady() && data.taskId)
          navigationRef.navigate('MainTabs', { screen: 'Tasks', params: { expandTaskId: data.taskId, _ts: Date.now() } });
      },

      'not-now': async (data) => {
        if (data.kind !== 'task-nudge' && data.kind !== 'step-reminder') return;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Task reminder',
            body: 'Still on your list — want to tackle it soon?',
            categoryIdentifier: 'task-nudge',
            data,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 60 * 60 },
        });
      },
    };

    const detach = attachNotificationResponseListener(handlers);
    // the app was closed when the notification was tapped
    const t = setTimeout(() => consumeLastNotificationResponse(handlers), 1500);
    return () => {
      detach();
      clearTimeout(t);
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppDataProvider>
            <ProductivityProvider>
              <NavigationContainer ref={navigationRef}>
                <AppNavigator />
                <NotificationBridge />
                <CelebrationHost />
                <MiniPlayer />
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