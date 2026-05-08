import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Clock, Trophy, Flame } from 'lucide-react-native';
import { useAppData } from '../../contexts/AppDataContext';

// ── Theme palette (must match TasksScreen & AddTaskBottomSheet) ───────────────
const CARD_THEMES = {
  coral:    { accent: '#FF6B7A', cardGradient: ['#FF6B7A', '#FF8FA3'], textLight: '#FFF5F5' },
  sky:      { accent: '#4DA6FF', cardGradient: ['#4DA6FF', '#7EC8FF'], textLight: '#F0F8FF' },
  mint:     { accent: '#3ECFA0', cardGradient: ['#3ECFA0', '#6EECC0'], textLight: '#F0FFF8' },
  lavender: { accent: '#9B7FE8', cardGradient: ['#9B7FE8', '#C4AAFF'], textLight: '#F7F4FF' },
  teal:     { accent: '#2EC4B6', cardGradient: ['#2EC4B6', '#5EEADC'], textLight: '#F0FFFD' },
};

const getTheme = (id) => CARD_THEMES[id] || CARD_THEMES.coral;

const daysSince = (isoString) => {
  if (!isoString) return 0;
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000);
};

const formatCompleted = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const days = daysSince(isoString);
  if (days === 0) return 'Completed today';
  if (days === 1) return 'Completed yesterday';
  return `Completed ${days}d ago · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// ── History Card ──────────────────────────────────────────────────────────────
function HistoryCard({ task }) {
  const th = getTheme(task.themeId);
  const days = daysSince(task.completedAt);
  const daysLeft = 10 - days;
  const subtaskCount = task.subtasks?.length || 0;
  const coinsEarned = subtaskCount * 3 + 5; // 3 per subtask + 5 completion bonus

  return (
    <View style={styles.cardWrapper}>
      {/* Left accent bar using theme color */}
      <View style={[styles.accentBar, { backgroundColor: th.accent }]} />

      <View style={styles.cardBody}>
        {/* Top row: title + check icon */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
            <Text style={styles.dateMeta}>{formatCompleted(task.completedAt)}</Text>
          </View>
          <View style={[styles.checkBubble, { backgroundColor: th.accent + '22' }]}>
            <CheckCircle2 color={th.accent} size={22} />
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>🪙</Text>
            <Text style={styles.statText}>+{coinsEarned} coins</Text>
          </View>
          <View style={styles.statChip}>
            <Flame size={13} color="#F97316" />
            <Text style={styles.statText}>{subtaskCount} tasks done</Text>
          </View>
          <View style={[
            styles.statChip,
            daysLeft <= 2 && { backgroundColor: 'rgba(239,68,68,0.12)' },
          ]}>
            <Clock size={13} color={daysLeft <= 2 ? '#EF4444' : '#64748B'} />
            <Text style={[styles.statText, daysLeft <= 2 && { color: '#EF4444' }]}>
              {daysLeft}d left
            </Text>
          </View>
        </View>

        {/* Subtask list (collapsed) */}
        <View style={styles.subtaskList}>
          {(task.subtasks || []).slice(0, 3).map((sub) => (
            <View key={sub.id} style={styles.subtaskRow}>
              <View style={[styles.subtaskDot, { backgroundColor: th.accent }]} />
              <Text style={styles.subtaskText} numberOfLines={1}>{sub.title}</Text>
            </View>
          ))}
          {(task.subtasks?.length || 0) > 3 && (
            <Text style={styles.moreText}>
              +{task.subtasks.length - 3} more subtasks
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyHistory() {
  return (
    <View style={styles.emptyWrap}>
      <Trophy color="#334155" size={52} />
      <Text style={styles.emptyTitle}>No accomplishments yet</Text>
      <Text style={styles.emptySub}>Complete your first task to see it here!</Text>
    </View>
  );
}

// ── Stats Banner ──────────────────────────────────────────────────────────────
function StatsBanner({ tasks }) {
  const totalCoins = tasks.reduce((acc, t) => {
    const s = t.subtasks?.length || 0;
    return acc + s * 3 + 5;
  }, 0);

  return (
    <LinearGradient
      colors={['#1E293B', '#0F172A']}
      style={styles.banner}
    >
      <View style={styles.bannerStat}>
        <Text style={styles.bannerValue}>{tasks.length}</Text>
        <Text style={styles.bannerLabel}>Completed</Text>
      </View>
      <View style={styles.bannerDivider} />
      <View style={styles.bannerStat}>
        <Text style={styles.bannerValue}>🪙 {totalCoins}</Text>
        <Text style={styles.bannerLabel}>Coins Earned</Text>
      </View>
      <View style={styles.bannerDivider} />
      <View style={styles.bannerStat}>
        <Text style={styles.bannerValue}>
          {tasks.reduce((a, t) => a + (t.subtasks?.length || 0), 0)}
        </Text>
        <Text style={styles.bannerLabel}>Subtasks</Text>
      </View>
    </LinearGradient>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TaskHistoryScreen({ navigation, route }) {
  const { taskHistory } = useAppData();
  const historyTasks = route?.params?.historyTasks?.length ? route.params.historyTasks : taskHistory;

  // Filter to last 10 days only
  const recent = historyTasks.filter((t) => daysSince(t.completedAt) <= 10);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          {navigation && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.screenTitle}>Accomplishments</Text>
            <Text style={styles.screenSub}>
              {recent.length > 0
                ? `${recent.length} task${recent.length > 1 ? 's' : ''} · cleared after 10 days`
                : 'Tasks are cleared after 10 days'}
            </Text>
          </View>
        </View>

        {/* ── Stats Banner ── */}
        {recent.length > 0 && <StatsBanner tasks={recent} />}

        {/* ── List ── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {recent.length === 0 ? (
            <EmptyHistory />
          ) : (
            recent.map((task) => (
              <HistoryCard key={task.id} task={task} />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#94A3B8',
    fontSize: 20,
    lineHeight: 24,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
  },
  screenSub: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
  },

  // Stats Banner
  banner: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bannerStat: {
    alignItems: 'center',
    flex: 1,
  },
  bannerValue: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '800',
  },
  bannerLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bannerDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // History Card
  cardWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    // elevation for the lifted look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    lineHeight: 22,
    marginBottom: 3,
  },
  dateMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  checkBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats chips
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statIcon: { fontSize: 12 },
  statText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Subtask list
  subtaskList: {
    gap: 5,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  subtaskDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.7,
  },
  subtaskText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    textDecorationLine: 'line-through',
  },
  moreText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 12,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 14,
  },
  emptyTitle: {
    color: '#475569',
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    color: '#334155',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});