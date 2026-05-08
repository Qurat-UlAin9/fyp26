import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Brain } from 'lucide-react-native';

export default function SplashIntroScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient colors={['#0F172A', '#312E81', '#9333EA']} style={styles.container}>
      <View style={styles.logoCircle}>
        <Brain size={58} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>FocusMind</Text>
      <Text style={styles.subtitle}>ADHD Wellness Companion</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: 'rgba(226,232,240,0.95)',
    marginTop: 10,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
