import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { User, Award, Settings, Play, Smile, Bot, CheckCircle, Clock, Flame } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';

export default function HomeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Row */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <User color={theme.text} size={28} />
            </View>
          </TouchableOpacity>
          <View style={styles.greetingContainer}>
            <Text style={[styles.greeting, { color: theme.text }]}>Good Morning, Alex ✨</Text>
            <Text style={[styles.subGreeting, { color: theme.textSecondary }]}>Let's make today amazing!</Text>
          </View>
          <View style={styles.rightIcons}>
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')} style={styles.iconButton}>
              <Award color={theme.text} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
              <Settings color={theme.text} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Motivational Quote Card */}
        <GlassCard style={styles.quoteCard} glow>
          <Text style={[styles.quoteText, { color: theme.text }]}>
            "You are capable of amazing things."
          </Text>
          <Text style={[styles.quoteAuthor, { color: theme.textSecondary }]}>– Unknown</Text>
        </GlassCard>

        {/* 3 Compact Action Cards */}
        <View style={styles.actionRow}>
          <GlassCard style={styles.actionCard}>
            <Play color={theme.accentGradient[0]} size={32} />
            <Text style={[styles.actionTitle, { color: theme.text }]}>Quick Focus</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>25:00</Text>
          </GlassCard>
          <GlassCard style={styles.actionCard}>
            <Smile color={theme.accentGradient[1]} size={32} />
            <Text style={[styles.actionTitle, { color: theme.text }]}>Check-In</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>How are you?</Text>
          </GlassCard>
          <GlassCard style={styles.actionCard}>
            <Bot color={theme.accentGradient[2]} size={32} />
            <Text style={[styles.actionTitle, { color: theme.text }]}>AI Assistant</Text>
            <Text style={[styles.actionSub, { color: theme.textSecondary }]}>Ask anything</Text>
          </GlassCard>
        </View>

        {/* Today's Snapshot */}
        <View style={styles.snapshotRow}>
          <GlassCard style={styles.snapshotCard}>
            <CheckCircle color="#8B5CF6" size={24} />
            <Text style={[styles.snapshotValue, { color: theme.text }]}>3</Text>
            <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Tasks</Text>
          </GlassCard>
          <GlassCard style={styles.snapshotCard}>
            <Clock color="#EC4899" size={24} />
            <Text style={[styles.snapshotValue, { color: theme.text }]}>45</Text>
            <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Focus min</Text>
          </GlassCard>
          <GlassCard style={styles.snapshotCard}>
            <Flame color="#3B82F6" size={24} />
            <Text style={[styles.snapshotValue, { color: theme.text }]}>7</Text>
            <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Streak</Text>
          </GlassCard>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  greetingContainer: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 20, fontWeight: '600' },
  subGreeting: { fontSize: 14, marginTop: 2 },
  rightIcons: { flexDirection: 'row' },
  iconButton: { marginLeft: 16 },
  quoteCard: { padding: 20, marginBottom: 24, alignItems: 'center' },
  quoteText: { fontSize: 18, fontStyle: 'italic', textAlign: 'center' },
  quoteAuthor: { fontSize: 14, marginTop: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 16 },
  actionTitle: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  actionSub: { fontSize: 12, marginTop: 2 },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between' },
  snapshotCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 12 },
  snapshotValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  snapshotLabel: { fontSize: 12 },
});