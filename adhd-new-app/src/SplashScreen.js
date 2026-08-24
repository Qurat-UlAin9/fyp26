import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './components/common/ThemeProvider';
import { Brain } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync();

const SplashScreenComponent = ({ onReady }) => {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
      onReady();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={['#6366F1', '#4F46E5', '#3730A3']} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Brain size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>FocusMind</Text>
        <Text style={styles.subtitle}>ADHD Wellness</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  iconCircle: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 40
  },
  title: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  subtitle: { fontSize: 20, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 8 }
});

export default SplashScreenComponent;
