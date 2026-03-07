import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { Award, Settings } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/common/GlassCard';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const navigation = useNavigation();
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : 'Good Evening';

  return (
    <ImageBackground source={{ uri: theme === 'dark' ? 'dark_bg_url' : 'light_bg_url' }} style={styles.background}> {/* Placeholder URLs */}
      <LinearGradient colors={colors.gradients} style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: themeColors.text }]}>{`${greeting}, Ain ★`}</Text>
          <View style={styles.icons}>
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')}>
              <Award color={themeColors.text} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginLeft: 10 }}>
              <Settings color={themeColors.text} size={24} />
            </TouchableOpacity>
          </View>
        </View>
        <GlassCard style={styles.quoteCard}>
          <Text style={[styles.quote, { color: themeColors.text }]}>"Believe in yourself and you will be unstoppable."</Text>
          <Text style={[styles.author, { color: themeColors.text }]}>- Motivational Quote</Text>
        </GlassCard>
        <TouchableOpacity onPress={() => navigation.navigate('Chatbot')} style={styles.chatButton}>
          <Text style={styles.chatText}>Chat with AI Coach</Text>
        </TouchableOpacity>
        <View style={styles.summaries}>
          <GlassCard style={styles.summary}>
            <Text style={[styles.summaryText, { color: themeColors.text }]}>Today's Tasks ✅ 3</Text>
          </GlassCard>
          <GlassCard style={styles.summary}>
            <Text style={[styles.summaryText, { color: themeColors.text }]}>Quick Timer 25:00</Text>
          </GlassCard>
          <GlassCard style={styles.summary}>
            <Text style={[styles.summaryText, { color: themeColors.text }]}>Habit Tracker 🔥 5 Days</Text>
          </GlassCard>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  icons: {
    flexDirection: 'row',
  },
  quoteCard: {
    marginBottom: 20,
  },
  quote: {
    fontSize: 20,
    textAlign: 'center',
  },
  author: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  chatButton: {
    backgroundColor: colors.light.primary,
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  chatText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  summaries: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summary: {
    width: '30%',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
  },
});

export default HomeScreen;