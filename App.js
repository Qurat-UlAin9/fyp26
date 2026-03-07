import React, { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/common/ErrorBoundary'; // Import if you added this file
import { Text, View } from 'react-native'; // For error fallback UI

const App = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Poppins': require('./assets/fonts/Poppins-Regular.ttf'),
          'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
          'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'), // Added for bold headers/titles
        });
        setFontsLoaded(true);
      } catch (error) {
        setFontError(error);
      }
    }
    loadFonts();
  }, []);

  if (fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Font loading error: {fontError.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return null; // Or add a custom loading screen for better UX in your ADHD app
  }

  return (
    <ThemeProvider>
      <ErrorBoundary> {/* Wraps to handle errors like HeaderTitle TypeError */}
        <AppNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;