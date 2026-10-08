import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Clock, Trophy, Flame } from 'lucide-react-native';
import { useAppData } from '../../contexts/AppDataContext';
import { useTheme } from '../../contexts/ThemeContext';

const CARD_THEMES = {
  coral:    { accent: '#FF6B7A' },
  sky:      { accent: '#4DA6FF' },
  mint:     { accent: '#3ECFA0' },
  lavender: { accent: '#9B7FE8' },
  teal:     { accent: '#2EC4B6' },
};
const getCardTheme = (id) => CARD_THEMES[id] || CARD_THEMES.coral;

const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);

const formatCompleted = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const days = daysSince(iso);
  if (days === 0) return 'Completed today';
  if (days === 1) return 'Completed yesterday';
  return `Completed ${days}d ago · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

function HistoryCard({ task, theme }) {
  const th = getCardTheme(task.themeId);
  const days = daysSince(task.completedAt);
  const daysLeft = 10 - days;
  const subtaskCount = task.subtasks?.length || 0;
  const coinsEarned = subtaskCount + 5;

  return (
    <View
      style={[
        styles.cardWrapper,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: th.accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, { color: theme.text }]} numberOfLines={2}>
              {task.title}
            </Text>
            <Text style={[styles.dateMeta, { color: theme.textSecondary }]}>
              {formatCompleted(task.completedAt)}
            </Text>
          </View>
          <View style={[styles.checkBubble, { backgroundColor: th.accent + '22' }]}>
            <CheckCircle2 color={th.accent} size={22} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: theme.border }]}>
            <Text style={styles.statIcon}>🪙</Text>
            <Text style={[styles.statText, { color: theme.textSecondary }]}>+{coinsEarned} coins</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: theme.border }]}>
            <Flame size={13} color="#F97316" />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>{subtaskCount} done</Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: theme.border },
              daysLeft <= 2 && { backgroundColor: 'rgba(239,68,68,0.18)' },
            ]}
          >
            <Clock size={13} color={daysLeft <= 2 ? '#EF4444' : theme.textSecondary} />
            <Text style={[styles.statText, { color: theme.textSecondary }, daysLeft <= 2 && { color: '#EF4444' }]}>
              {daysLeft}d left
            </Text>
          </View>
        </View>

        <View style={styles.subtaskList}>
          {(task.subtasks || []).slice(0, 3).map((sub) => (
            <View key={sub.id} style={styles.subtaskRow}>
              <View style={[styles.subtaskDot, { backgroundColor: th.accent }]} />
              <Text style={[styles.subtaskText, { color: theme.textSecondary }]} numberOfLines={1}>
                {sub.title}
              </Text>
            </View>
          ))}
          {(task.subtasks?.length || 0) > 3 && (
            <Text style={[styles.moreText, { color: theme.textSecondary }]}>
              +{task.subtasks.length - 3} more subtasks
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function EmptyHistory({ theme }) {
  return (
    <View style={styles.emptyWrap}>
      <Trophy color={theme.textSecondary} size={52} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No accomplishments yet</Text>
      <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
        Complete your first task to see it here!
      </Text>
    </View>
  );
}

function StatsBanner({ tasks, theme }) {
  const totalCoins = tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0) + 5, 0);
  return (
    <View style={[styles.banner, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.bannerStat}>
        <Text style={[styles.bannerValue, { color: theme.text }]}>{tasks.length}</Text>
        <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Completed</Text>
      </View>
      <View style={[styles.bannerDivider, { backgroundColor: theme.border }]} />
      <View style={styles.bannerStat}>
        <Text style={[styles.bannerValue, { color: theme.text }]}>🪙 {totalCoins}</Text>
        <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Coins Earned</Text>
      </View>
      <View style={[styles.bannerDivider, { backgroundColor: theme.border }]} />
      <View style={styles.bannerStat}>
        <Text style={[styles.bannerValue, { color: theme.text }]}>
          {tasks.reduce((a, t) => a + (t.subtasks?.length || 0), 0)}
        </Text>
        <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Subtasks</Text>
      </View>
    </View>
  );
}

export default function TaskHistoryScreen({ navigation, route }) {
  const { taskHistory } = useAppData();
  const { theme } = useTheme();

  const historyTasks = route?.params?.historyTasks?.length ? route.params.historyTasks : taskHistory;
  const recent = historyTasks.filter((t) => t.completedAt && daysSince(t.completedAt) <= 10);

  return (
    <LinearGradient colors={theme.background} style={styles.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          {navigation && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: theme.card }]}
            >
              <Text style={[styles.backArrow, { color: theme.text }]}>←</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Accomplishments</Text>
            <Text style={[styles.screenSub, { color: theme.textSecondary }]}>
              {recent.length > 0
                ? `${recent.length} task${recent.length > 1 ? 's' : ''} · cleared after 10 days`
                : 'Tasks are cleared after 10 days'}
            </Text>
          </View>
        </View>

        {recent.length > 0 && <StatsBanner tasks={recent} theme={theme} />}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {recent.length === 0 ? (
            <EmptyHistory theme={theme} />
          ) : (
            recent.map((task) => <HistoryCard key={task.id} task={task} theme={theme} />)
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: 20, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 20, lineHeight: 24 },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  screenSub: { fontSize: 13, marginTop: 2 },

  banner: {
    flexDirection: 'row', marginHorizontal: 16, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 10, marginBottom: 16,
    borderWidth: 1, alignItems: 'center', justifyContent: 'space-around',
  },
  bannerStat: { alignItems: 'center', flex: 1 },
  bannerValue: { fontSize: 20, fontWeight: '800' },
  bannerLabel: { fontSize: 11, fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  bannerDivider: { width: 1, height: 36 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  cardWrapper: {
    flexDirection: 'row', borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  taskTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 3 },
  dateMeta: { fontSize: 12, fontWeight: '500' },
  checkBubble: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  statIcon: { fontSize: 12 },
  statText: { fontSize: 11, fontWeight: '600' },

  subtaskList: { gap: 5 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  subtaskDot: { width: 5, height: 5, borderRadius: 3, opacity: 0.7 },
  subtaskText: { fontSize: 12, fontWeight: '500', flex: 1, textDecorationLine: 'line-through' },
  moreText: { fontSize: 11, fontWeight: '600', marginTop: 2, marginLeft: 12 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});