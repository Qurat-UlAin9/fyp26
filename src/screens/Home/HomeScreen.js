import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Gift, Settings, MessageCircle, Timer, HeartPulse, Leaf, ListTodo, Flame, Clock3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const HomeScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const isDark = theme === 'dark';
  const themeColors = colors[theme];
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';

  const quickActions = [
    {
      key: 'focus',
      title: 'Focus Quick Start',
      info: '25:00',
      icon: Timer,
      colors: isDark ? ['#6D28D9', '#2563EB'] : ['#A78BFA', '#60A5FA'],
      onPress: () => navigation.navigate('Focus'),
    },
    {
      key: 'emotion',
      title: 'Emotion Check-In',
      info: 'Track mood',
      icon: HeartPulse,
      colors: isDark ? ['#9333EA', '#DB2777'] : ['#F0ABFC', '#F9A8D4'],
      onPress: () => navigation.navigate('EmotionRegulation'),
    },
    {
      key: 'habits',
      title: 'Habits',
      info: '5 day streak',
      icon: Leaf,
      colors: isDark ? ['#0F766E', '#0284C7'] : ['#6EE7B7', '#7DD3FC'],
      onPress: () => navigation.navigate('Habits'),
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.background }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: themeColors.text }]}>{`${greeting}, Ain ✨`}</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#CBD5E1' : '#64748B' }]}>Let's make today amazing!</Text>
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')} style={[styles.iconButton, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Gift color={themeColors.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.iconButton, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Settings color={themeColors.primary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.quoteCardOuter, { backgroundColor: isDark ? '#1A1F52' : '#FFFFFF' }]}>
          <LinearGradient
            colors={isDark ? ['#1E2A78', '#493C9E', '#7E5ACD'] : ['#87E5E6', '#60A5FA', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quoteCardInner}
          >
            <View style={styles.illustrationTop} />
            <View style={styles.quoteOverlay}>
              <Text style={styles.quoteText}>“Small steps every day lead to big changes.”</Text>
              <Text style={styles.quoteAuthor}>— Daily Motivation</Text>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Chatbot')} activeOpacity={0.9}>
          <LinearGradient
            colors={isDark ? ['#7C3AED', '#2563EB'] : ['#A78BFA', '#22D3EE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiRowCard}
          >
            <MessageCircle color="#FFFFFF" size={20} />
            <Text style={styles.aiRowText}>AI Chat • Ask for support right now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.quickRow}>
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity key={item.key} onPress={item.onPress} activeOpacity={0.9} style={styles.quickCardWrap}>
                <LinearGradient colors={item.colors} style={styles.quickCard}>
                  <Icon color="#FFFFFF" size={18} />
                  <Text style={styles.quickCardTitle}>{item.title}</Text>
                  <Text style={styles.quickCardInfo}>{item.info}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.snapshotRow}>
          <LinearGradient colors={isDark ? ['#312E81', '#1D4ED8'] : ['#FFFFFF', '#E0E7FF']} style={styles.snapshotCard}>
            <ListTodo color={isDark ? '#C4B5FD' : '#6366F1'} size={18} />
            <Text style={[styles.snapshotLabel, { color: isDark ? '#BFDBFE' : '#4338CA' }]}>Tasks</Text>
            <Text style={[styles.snapshotValue, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>3 pending</Text>
          </LinearGradient>

          <LinearGradient colors={isDark ? ['#4C1D95', '#C026D3'] : ['#FCE7F3', '#E9D5FF']} style={styles.snapshotCard}>
            <Clock3 color={isDark ? '#F0ABFC' : '#9333EA'} size={18} />
            <Text style={[styles.snapshotLabel, { color: isDark ? '#F5D0FE' : '#6B21A8' }]}>Focus</Text>
            <Text style={[styles.snapshotValue, { color: isDark ? '#FFFFFF' : '#3B0764' }]}>62 min</Text>
          </LinearGradient>

          <LinearGradient colors={isDark ? ['#155E75', '#1D4ED8'] : ['#D1FAE5', '#BAE6FD']} style={styles.snapshotCard}>
            <Flame color={isDark ? '#FDE68A' : '#EA580C'} size={18} />
            <Text style={[styles.snapshotLabel, { color: isDark ? '#BAE6FD' : '#0E7490' }]}>Habits</Text>
            <Text style={[styles.snapshotValue, { color: isDark ? '#FFFFFF' : '#0C4A6E' }]}>5 day streak</Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  greeting: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#312E81',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  quoteCardOuter: {
    borderRadius: 24,
    padding: 5,
    marginBottom: 18,
    shadowColor: '#4C1D95',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  quoteCardInner: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 220,
    justifyContent: 'flex-end',
  },
  illustrationTop: {
    position: 'absolute',
    top: -30,
    right: -10,
    left: -10,
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
  quoteOverlay: {
    margin: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(7,10,36,0.35)',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  quoteText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 35,
    textAlign: 'center',
    fontWeight: '700',
  },
  quoteAuthor: {
    marginTop: 10,
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
  },
  aiRowCard: {
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  aiRowText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  quickCardWrap: {
    flex: 1,
  },
  quickCard: {
    borderRadius: 16,
    minHeight: 125,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'space-between',
    shadowColor: '#312E81',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  quickCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  quickCardInfo: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  snapshotCard: {
    flex: 1,
    borderRadius: 15,
    minHeight: 90,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  snapshotLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  snapshotValue: {
    fontSize: 18,
    fontWeight: '800',
  },
});

export default HomeScreen;
