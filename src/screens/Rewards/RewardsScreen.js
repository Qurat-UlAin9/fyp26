import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Award,
  Bot,
  Flame,
  Lock,
  Palette,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const ACHIEVEMENTS = [
  { name: 'First Step', progress: 'Complete your first task', unlocked: true },
  { name: 'Momentum Builder', progress: 'Keep a 3-day streak', unlocked: true },
  { name: 'Focus Navigator', progress: 'Complete 25 focus sessions', unlocked: false },
  { name: 'Routine Creator', progress: 'Maintain a 14-day streak', unlocked: false },
];

const INVENTORY = [
  { name: 'Neon Visor', cost: 80, type: 'Accessory', unlocked: true, equipped: true },
  { name: 'Jetpack Wings', cost: 150, type: 'Upgrade', unlocked: true, equipped: false },
  { name: 'Spark Aura', cost: 100, type: 'Effect', unlocked: false, equipped: false },
  { name: 'Galaxy Shell', cost: 220, type: 'Skin', unlocked: false, equipped: false },
];

const THEMES = [
  { name: 'Focus Night', colors: ['#1D4ED8', '#312E81'], unlocked: true },
  { name: 'Calm Lavender', colors: ['#A78BFA', '#F9A8D4'], unlocked: true },
  { name: 'Energy Pulse', colors: ['#0EA5E9', '#7C3AED'], unlocked: false },
];

const TABS = ['Achievements', 'Companion', 'Inventory', 'Themes'];

const TAB_ICONS = {
  Achievements: Award,
  Companion: Bot,
  Inventory: ShoppingBag,
  Themes: Palette,
};

export default function RewardsScreen() {
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('Achievements');
  const float = useSharedValue(0);
  const glow = useSharedValue(0.75);

  React.useEffect(() => {
    float.value = withRepeat(withSequence(withTiming(-6, { duration: 1200 }), withTiming(6, { duration: 1200 })), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [float, glow]);

  const botFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value }],
  }));

  const botGlowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  const unlockedAchievements = useMemo(
    () => ACHIEVEMENTS.filter((item) => item.unlocked).length,
    []
  );

  const coins = 245;
  const streak = 6;
  const equippedTitle = 'Momentum Builder';

  const renderAchievements = () => (
    <View style={styles.panelStack}>
      {ACHIEVEMENTS.map((item) => (
        <View
          key={item.name}
          style={[
            styles.rowCard,
            {
              backgroundColor: isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.92)',
              borderColor: item.unlocked ? 'rgba(56,189,248,0.55)' : 'rgba(148,163,184,0.35)',
            },
          ]}
        >
          <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? '#0EA5E9' : '#64748B' }]}>
            {item.unlocked ? <Star color="#FFFFFF" size={16} /> : <Lock color="#FFFFFF" size={16} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>{item.progress}</Text>
          </View>
          <Text style={[styles.statusText, { color: item.unlocked ? '#22C55E' : theme.textSecondary }]}>
            {item.unlocked ? 'Unlocked' : 'Locked'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderCompanion = () => (
    <View
      style={[
        styles.companionCard,
        { backgroundColor: isDark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.92)' },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Virtual Champion</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>A tiny robot that reacts to your focus wins.</Text>

      <View style={styles.robotStage}>
        <Animated.View style={[styles.robotGlow, botGlowStyle]} />
        <Animated.View style={[styles.robotBody, botFloatStyle]}>
          <Bot color="#67E8F9" size={58} strokeWidth={2.2} />
          <View style={styles.robotEyesRow}>
            <View style={styles.robotEye} />
            <View style={styles.robotEye} />
          </View>
        </Animated.View>
      </View>

      <View style={styles.reactionRow}>
        <View style={styles.reactionItem}>
          <Sparkles size={16} color="#22D3EE" />
          <Text style={[styles.reactionText, { color: theme.textSecondary }]}>Celebrates after tasks</Text>
        </View>
        <View style={styles.reactionItem}>
          <Flame size={16} color="#F97316" />
          <Text style={[styles.reactionText, { color: theme.textSecondary }]}>Boosts streak motivation</Text>
        </View>
      </View>
    </View>
  );

  const renderInventory = () => (
    <View style={styles.panelStack}>
      {INVENTORY.map((item) => (
        <View
          key={item.name}
          style={[
            styles.rowCard,
            {
              backgroundColor: isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.92)',
              borderColor: item.equipped ? '#22D3EE' : 'rgba(148,163,184,0.35)',
            },
          ]}
        >
          <View style={[styles.badgeIcon, { backgroundColor: item.unlocked ? '#8B5CF6' : '#64748B' }]}>
            <ShoppingBag color="#FFFFFF" size={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>{item.type} • {item.cost} coins</Text>
          </View>
          <Text style={[styles.statusText, { color: item.unlocked ? '#22C55E' : '#94A3B8' }]}>
            {item.equipped ? 'Equipped' : item.unlocked ? 'Owned' : 'Locked'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderThemes = () => (
    <View style={styles.themeGrid}>
      {THEMES.map((item) => (
        <View key={item.name} style={styles.themeWrap}>
          <LinearGradient colors={item.colors} style={[styles.themePreview, { opacity: item.unlocked ? 1 : 0.5 }]}>
            {!item.unlocked && <Lock color="#FFFFFF" size={16} />}
          </LinearGradient>
          <Text style={[styles.themeName, { color: theme.text }]}>{item.name}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === 'Companion') return renderCompanion();
    if (activeTab === 'Inventory') return renderInventory();
    if (activeTab === 'Themes') return renderThemes();
    return renderAchievements();
  };

  return (
    <LinearGradient colors={isDark ? ['#020617', '#0F172A', '#1E1B4B'] : ['#E0F2FE', '#EEF2FF', '#F8FAFC']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.screenTitle}>Reward Hub</Text>
              <Text style={styles.screenSubtitle}>Keep your momentum with coins, titles, and robot upgrades.</Text>
            </View>
            <Animated.View style={botGlowStyle}>
              <Sparkles color="#67E8F9" size={22} />
            </Animated.View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{coins}</Text>
              <Text style={styles.statLabel}>Focus Coins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streak} days</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{unlockedAchievements}/{ACHIEVEMENTS.length}</Text>
              <Text style={styles.statLabel}>Titles</Text>
            </View>
          </View>

          <View style={styles.currentTitleWrap}>
            <Text style={styles.currentTitleLabel}>Active title</Text>
            <Text style={styles.currentTitleValue}>{equippedTitle}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab];
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: active ? '#0EA5E9' : isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.82)',
                    borderColor: active ? '#22D3EE' : 'rgba(148,163,184,0.35)',
                  },
                ]}
                activeOpacity={0.9}
              >
                <Icon color={active ? '#FFFFFF' : theme.textSecondary} size={16} />
                <Text style={[styles.tabText, { color: active ? '#FFFFFF' : theme.text }]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {renderTabContent()}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  headerCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(15,23,42,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.3)',
    marginBottom: 14,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  screenSubtitle: { color: '#CFFAFE', fontSize: 13, marginTop: 4, maxWidth: 260 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statItem: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(15,23,42,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  statValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: '#BAE6FD', fontSize: 11, textAlign: 'center', marginTop: 4 },
  currentTitleWrap: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(14,165,233,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.45)',
  },
  currentTitleLabel: { color: '#BAE6FD', fontSize: 12 },
  currentTitleValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginTop: 2 },
  tabsRow: { paddingVertical: 8, paddingRight: 8, gap: 10 },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  panelStack: { marginTop: 8, gap: 10 },
  rowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  statusText: { fontSize: 12, fontWeight: '700' },
  companionCard: {
    marginTop: 8,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.32)',
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionSubtitle: { marginTop: 4, fontSize: 12 },
  robotStage: {
    height: 190,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(30,41,59,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  robotGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(34,211,238,0.25)',
  },
  robotBody: { alignItems: 'center', justifyContent: 'center' },
  robotEyesRow: { flexDirection: 'row', gap: 12, marginTop: -10 },
  robotEye: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A5F3FC' },
  reactionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  reactionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  reactionText: { fontSize: 11, flexShrink: 1 },
  themeGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeWrap: { width: '48%' },
  themePreview: {
    height: 100,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  themeName: { marginTop: 6, fontSize: 12, fontWeight: '600' },
});
