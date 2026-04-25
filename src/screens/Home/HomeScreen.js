import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Award, MessageCircle, Timer, SmilePlus, Leaf, ListChecks, Clock3, Flame, UserCircle2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import CoinBalancePill from '../../components/common/CoinBalancePill';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';
import FocusSessionScheduler from '../../components/focus/FocusSessionScheduler';
import { useAppData } from '../../contexts/AppDataContext';

export default function HomeScreen() {
  const { theme, isDark, stats } = useTheme();
  const { profile, tasks, habits, focusSessions } = useAppData();
  const navigation = useNavigation();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const [quoteImageFailed, setQuoteImageFailed] = useState(false);
  const totalHabitSlots = useMemo(() => habits.reduce((acc, h) => acc + (h.timeSlots?.length || 0), 0), [habits]);
  const completedHabitSlots = useMemo(() => habits.reduce((acc, h) => acc + (h.completions?.filter(Boolean).length || 0), 0), [habits]);

  const screenBackground = theme.background[0];

  const quickActions = [
    {
      key: 'focus',
      title: 'Focus Quick Start',
      info: '25:00',
      icon: Timer,
      colors: isDark ? ['#4C1D95', '#1D4ED8'] : ['#A78BFA', '#60A5FA'],
      onPress: () => navigation.navigate('Focus'),
    },
    {
      key: 'emotion',
      title: 'Emotion Check-In',
      info: 'Track mood',
      icon: SmilePlus,
      colors: isDark ? ['#6D28D9', '#2563EB'] : ['#F0ABFC', '#F9A8D4'],
      onPress: () => navigation.navigate('EmotionRegulation'),
    },
    {
      key: 'habits',
      title: 'Habits',
      info: '3 day streak',
      icon: Leaf,
      colors: isDark ? ['#312E81', '#1E40AF'] : ['#6EE7B7', '#7DD3FC'],
      onPress: () => navigation.navigate('Habits'),
    },
  ];

  return (
    
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      <AnimatedOrbsBackground colors={[theme.glow + '40', theme.accentGradient[0] + '20', theme.accentGradient[1] + '20']} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.greetingWrap}>
            <View style={styles.greetRow}><TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.profileBtn, { backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : '#fff' }]}><UserCircle2 color={theme.accentGradient[0]} size={20} /></TouchableOpacity><Text style={[styles.greeting, { color: theme.text }]}>{`${greeting}, ${profile.name || 'Friend'} ✨`}</Text></View>
            <Text style={[styles.subGreeting, { color: theme.textSecondary }]}>Let's make today amazing!</Text>
          </View>

          <View style={styles.rightIcons}>
            <CoinBalancePill />
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')} style={[styles.iconButton, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <Award color={theme.accentGradient[0]} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.quoteOuter, { backgroundColor: isDark ? '#111A4A' : '#FFFFFF' }]}>
          <ImageBackground source={quoteImageFailed ? require('../../../assets/images/onboarding1.png') : { uri: theme.quoteImage }} style={styles.quoteInner} imageStyle={styles.quoteImage} onError={() => setQuoteImageFailed(true)}>
            <View style={styles.quoteOverlay}>
              <Text style={styles.quoteText}>“Small steps every day lead to big changes.”</Text>
              <Text style={styles.quoteAuthor}>— Daily Motivation</Text>
            </View>
          </ImageBackground>
        </View>


        <TouchableOpacity onPress={() => navigation.navigate('Questionnaire')} activeOpacity={0.9}>
          <LinearGradient
            colors={isDark ? ['#4C1D95', '#2563EB'] : ['#C4B5FD', '#A5B4FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.assessmentCard}
          >
            <Text style={styles.assessmentTitle}>Start Assessment</Text>
            <Text style={styles.assessmentSubtitle}>Answer a quick questionnaire to personalize your plan</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Chatbot')} activeOpacity={0.9}>
          <LinearGradient
            colors={isDark ? ['#5B21B6', '#1D4ED8'] : ['#A78BFA', '#22D3EE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCard}
          >
            <MessageCircle color="#FFFFFF" size={20} />
            <Text style={styles.aiText}>AI Chat • Ask for support right now</Text>
          </LinearGradient>
        </TouchableOpacity>
        <FocusSessionScheduler navigation={navigation} />

        <View style={styles.quickRow}>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity key={action.key} style={styles.quickWrap} onPress={action.onPress} activeOpacity={0.9}>
                <LinearGradient colors={action.colors} style={styles.quickCard}>
                  <Icon color="#FFFFFF" size={18} />
                  <Text style={styles.quickTitle}>{action.title}</Text>
                  <Text style={styles.quickInfo}>{action.info}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.snapshotRow}>
          <LinearGradient colors={isDark ? ['#1E1B4B', '#1D4ED8'] : ['#FFFFFF', '#E0E7FF']} style={styles.snapshotCard}>
            <ListChecks color={isDark ? '#C4B5FD' : '#6366F1'} size={18} />
            <Text style={[styles.snapshotTitle, { color: isDark ? '#BFDBFE' : '#4338CA' }]}>Tasks</Text>
            <Text style={[styles.snapshotValue, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>{tasks.length} pending</Text>
          </LinearGradient>

          <LinearGradient colors={isDark ? ['#4C1D95', '#2563EB'] : ['#FCE7F3', '#E9D5FF']} style={styles.snapshotCard}>
            <Clock3 color={isDark ? '#F0ABFC' : '#9333EA'} size={18} />
            <Text style={[styles.snapshotTitle, { color: isDark ? '#F5D0FE' : '#6B21A8' }]}>Focus</Text>
            <Text style={[styles.snapshotValue, { color: isDark ? '#FFFFFF' : '#3B0764' }]}>{stats.focusMinutes} min</Text>
          </LinearGradient>

          <LinearGradient colors={isDark ? ['#1E3A8A', '#312E81'] : ['#D1FAE5', '#BAE6FD']} style={styles.snapshotCard}>
            <Flame color={isDark ? '#FDE68A' : '#EA580C'} size={18} />
            <Text style={[styles.snapshotTitle, { color: isDark ? '#BAE6FD' : '#0E7490' }]}>Habits</Text>
            <Text style={[styles.snapshotValue, { color: isDark ? '#FFFFFF' : '#0C4A6E' }]}>{completedHabitSlots}/{totalHabitSlots || 0}</Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  greetingWrap: { flex: 1, marginRight: 8 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#312E81', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  greeting: { fontSize: 30, fontWeight: '800' },
  subGreeting: { fontSize: 18, fontWeight: '600', marginTop: 6 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    shadowColor: '#312E81',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  quoteOuter: {
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#4338CA',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  quoteInner: { borderRadius: 20, minHeight: 220, justifyContent: 'flex-end', overflow: 'hidden' },
  quoteImage: { borderRadius: 20 },
  quoteOverlay: {
    margin: 14,
    backgroundColor: 'rgba(7,10,36,0.35)',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  quoteText: { color: '#FFFFFF', fontSize: 24, lineHeight: 32, textAlign: 'center', fontWeight: '700' },
  quoteAuthor: { color: '#E2E8F0', marginTop: 10, fontSize: 16, fontWeight: '600' },

  assessmentCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 14,
    shadowColor: '#4C1D95',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  assessmentTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
  assessmentSubtitle: { color: '#EDE9FE', marginTop: 6, fontSize: 14, fontWeight: '600' },

  aiCard: {
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  aiText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginLeft: 8 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  quickWrap: { flex: 1 },
  quickCard: {
    borderRadius: 16,
    minHeight: 118,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'space-between',
    shadowColor: '#312E81',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  quickTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  quickInfo: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  snapshotCard: {
    flex: 1,
    minHeight: 90,
    borderRadius: 15,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  snapshotTitle: { fontSize: 12, fontWeight: '700' },
  snapshotValue: { fontSize: 16, fontWeight: '800' },
});
