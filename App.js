import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { ThemeProvider } from './src/contexts/ThemeContext';
import { AppDataProvider } from './src/contexts/AppDataContext';
import { ProductivityProvider } from './src/contexts/ProductivityContext';
import AppNavigator from './src/navigation/AppNavigator';
import { toastConfig } from './src/utils/toastConfig';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppDataProvider>
            <ProductivityProvider>
              <NavigationContainer>
                <AppNavigator />
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