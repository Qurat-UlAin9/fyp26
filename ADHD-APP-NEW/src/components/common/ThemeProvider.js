import React, { createContext, useContext, useState, useEffect } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../../theme/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('adhd_theme');
      setTheme(saved || 'light');
    } catch (e) {} finally {
      setIsReady(true);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('adhd_theme', newTheme);
  };

  const colors = theme === 'dark' ? darkTheme : lightTheme;

  if (!isReady) return <View style={{flex:1, backgroundColor:'#F8FAFC'}} />;

  return <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
    {children}
  </ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
