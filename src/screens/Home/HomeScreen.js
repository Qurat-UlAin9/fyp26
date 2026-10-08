import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {
  Award,
  MessageCircle,
  Leaf,
  Clock3,
  Flame,
  UserCircle2,
  ChevronRight,
  Sparkles,
  Play,
  Target,
  Zap,
  Calendar,
  AlertCircle,
  RotateCcw,
  LogIn,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import { useProductivity } from '../../contexts/ProductivityContext';
import CoinBalancePill from '../../components/common/CoinBalancePill';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';
import FocusSessionScheduler from '../../components/focus/FocusSessionScheduler';
import MoodCheckInCard from '../../components/home/MoodCheckInCard';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function MetricPill({ icon: Icon, value, label, gradient, progress = 0 }) {
  return (
    <View style={styles.metricPillWrap}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricPill}
      >
        <Icon color="#FFFFFF" size={16} />
        <Text style={styles.metricPillValue}>{value}</Text>
        <Text style={styles.metricPillLabel}>{label}</Text>
        {progress > 0 && (
          <View style={styles.metricPillTrack}>
            <View
              style={[
                styles.metricPillFill,
                { width: `${Math.min(100, Math.max(0, progress))}%` },
              ]}
            />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function AssessmentCard({
  title,
  subtitle,
  taken,
  gradient,
  icon: Icon,
  onPrimary,
  onRetake,
}) {
  return (
    <View style={styles.assessWrap}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.assessCard}
      >
        <View style={styles.assessTopRow}>
          <View style={styles.assessIconWrap}>
            <Icon color="#FFFFFF" size={18} />
          </View>
          {taken && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✓ DONE</Text>
            </View>
          )}
        </View>

        <Text style={styles.assessTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.assessSub} numberOfLines={2}>
          {subtitle}
        </Text>

        <TouchableOpacity
          onPress={onPrimary}
          activeOpacity={0.85}
          style={styles.assessCta}
        >
          <Text style={styles.assessCtaText}>
            {taken ? 'View result' : 'Start now'}
          </Text>
          <ChevronRight color="#FFFFFF" size={14} strokeWidth={3} />
        </TouchableOpacity>

        {taken && onRetake ? (
          <TouchableOpacity
            onPress={onRetake}
            activeOpacity={0.75}
            style={styles.assessRetake}
          >
            <RotateCcw color="rgba(255,255,255,0.9)" size={11} strokeWidth={3} />
            <Text style={styles.assessRetakeText}>Retake</Text>
          </TouchableOpacity>
        ) : null}
      </LinearGradient>
    </View>
  );
}

function UpNextCard({ nextTask, onStartFocus, isDark }) {
  if (!nextTask) {
    return (
      <LinearGradient
        colors={isDark ? ['#1E1B4B', '#312E81'] : ['#EDE9FE', '#DBEAFE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.upNextCard}
      >
        <View style={styles.allClearHeader}>
          <Sparkles color={isDark ? '#C4B5FD' : '#7C3AED'} size={22} />
          <Text
            style={[
              styles.allClearTitle,
              { color: isDark ? '#E9D5FF' : '#4C1D95' },
            ]}
          >
            All clear
          </Text>
        </View>
        <Text
          style={[
            styles.allClearSub,
            { color: isDark ? '#A5B4FC' : '#6D28D9' },
          ]}
        >
          No active tasks right now. Ask your AI coach to help you plan.
        </Text>
      </LinearGradient>
    );
  }

  const { task, nextSub } = nextTask;
  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter((s) => s.done).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const dueLabel =
    task.dueDate || task.due_date
      ? new Date(task.dueDate || task.due_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : null;

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6', '#A855F7']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.upNextCard}
    >
      <View style={styles.upNextHeader}>
        <View style={styles.upNextBadge}>
          <Zap color="#FCD34D" size={12} fill="#FCD34D" />
          <Text style={styles.upNextBadgeText}>UP NEXT</Text>
        </View>
        <TouchableOpacity
          style={styles.upNextStartBtn}
          onPress={onStartFocus}
          activeOpacity={0.8}
        >
          <Play color="#7C3AED" size={12} fill="#7C3AED" />
          <Text style={styles.upNextStartText}>Start</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.upNextTitle} numberOfLines={2}>
        {task.title}
      </Text>

      {nextSub && (
        <View style={styles.upNextSubRow}>
          <View style={styles.upNextDot} />
          <Text style={styles.upNextSubText} numberOfLines={2}>
            {nextSub.title}
          </Text>
        </View>
      )}

      {totalCount > 0 && (
        <View style={styles.upNextProgressBlock}>
          <View style={styles.upNextProgressTrack}>
            <View
              style={[styles.upNextProgressFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.upNextProgressLabel}>
            {doneCount} of {totalCount} done
          </Text>
        </View>
      )}

      <View style={styles.upNextMeta}>
        {task.category && (
          <View style={styles.upNextMetaChip}>
            <Text style={styles.upNextMetaText}>{task.category}</Text>
          </View>
        )}
        {dueLabel && (
          <View style={styles.upNextMetaChip}>
            <Calendar color="#E9D5FF" size={11} />
            <Text style={styles.upNextMetaText}>Due {dueLabel}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

export default function HomeScreen() {
  const { theme, isDark, stats } = useTheme();
  const {
    profile,
    tasks,
    focusSessions,
    adhdAssessment,
    efAssessment,
    habitStats,
    syncError,
    sessionExpired,
    refreshData,
  } = useAppData();
  const { setActiveSessionTask } = useProductivity();
  const navigation = useNavigation();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const displayName = profile?.username || profile?.name || 'Friend';
  const today = todayISO();

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== 'Completed' && t.status !== 'Cancelled'
      ),
    [tasks]
  );

  const nextTask = useMemo(() => {
    if (activeTasks.length === 0) return null;

    const withScheduled = activeTasks
      .map((t) => {
        const pending = (t.subtasks || []).filter(
          (s) => !s.done && s.scheduledDate
        );
        if (pending.length === 0) return null;
        const nextSub = [...pending].sort((a, b) =>
          a.scheduledDate.localeCompare(b.scheduledDate)
        )[0];
        return { task: t, nextSub, sortKey: nextSub.scheduledDate };
      })
      .filter(Boolean)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    if (withScheduled.length > 0) return withScheduled[0];

    const withDue = activeTasks
      .filter((t) => t.dueDate || t.due_date)
      .sort((a, b) => {
        const aD = a.dueDate || a.due_date || '9999';
        const bD = b.dueDate || b.due_date || '9999';
        return aD.localeCompare(bD);
      });

    if (withDue.length > 0) {
      const task = withDue[0];
      const nextSub = (task.subtasks || []).find((s) => !s.done);
      return { task, nextSub };
    }

    for (const t of activeTasks) {
      const nextSub = (t.subtasks || []).find((s) => !s.done);
      if (nextSub) return { task: t, nextSub };
    }

    const t = activeTasks[0];
    const nextSub = (t.subtasks || [])[0];
    return { task: t, nextSub };
  }, [activeTasks]);

  const handleStartFocus = () => {
    if (!nextTask) return;
    setActiveSessionTask(nextTask.task);
    navigation.navigate('Focus', { task: nextTask.task });
  };

  const focusMinutesToday = useMemo(() => {
    return focusSessions
      .filter(
        (s) => (s.started_at || s.startedAt || '').slice(0, 10) === today
      )
      .reduce((sum, s) => sum + (s.actualMinutes || s.plannedMinutes || 0), 0);
  }, [focusSessions, today]);

  const habitTarget = habitStats?.dailyTarget || 0;
  const habitDone = habitStats?.todayDone || 0;
  const habitProgress = habitTarget > 0 ? (habitDone / habitTarget) * 100 : 0;

  const adhdTaken = Boolean(adhdAssessment);
  const adhdSubtitle = adhdTaken
    ? `${adhdAssessment.percentage ?? '—'}% · ${
        adhdAssessment.predicted_label || 'Recorded'
      }`
    : 'Not taken yet · 3 min';

  const efTaken = Boolean(efAssessment);
  const efSubtitle = efTaken
    ? 'Completed · view dimensions'
    : 'Not taken yet · 5 min';

  const avatarSource = profile?.avatarUrl ? { uri: profile.avatarUrl } : null;

  const handleRelogin = () => {
    navigation.replace('Login');
  };

  const handleRetry = () => {
    if (typeof refreshData === 'function') {
      refreshData().catch(() => undefined);
    }
  };

  const bannerKind = !syncError
    ? null
    : sessionExpired
      ? 'session'
      : 'network';

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <AnimatedOrbsBackground
        colors={[
          theme.glow + '40',
          theme.accentGradient[0] + '20',
          theme.accentGradient[1] + '20',
        ]}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.greetingWrap}>
            <View style={styles.greetRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                style={[
                  styles.profileBtn,
                  { backgroundColor: isDark ? 'rgba(15,23,42,0.6)' : '#fff' },
                ]}
                activeOpacity={0.85}
              >
                {avatarSource ? (
                  <Image source={avatarSource} style={styles.profileBtnImage} />
                ) : (
                  <UserCircle2 color={theme.accentGradient[0]} size={24} />
                )}
              </TouchableOpacity>
              <View style={styles.greetingText}>
                <Text style={[styles.greeting, { color: theme.text }]}>
                  {greeting},
                </Text>
                <Text style={[styles.greetingName, { color: theme.text }]}>
                  {displayName}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.rightIcons}>
            <CoinBalancePill />
            <TouchableOpacity
              onPress={() => navigation.navigate('Rewards')}
              style={[
                styles.iconButton,
                { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
              ]}
            >
              <Award color={theme.accentGradient[0]} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══════════ SYNC / SESSION BANNER ═══════════ */}
        {bannerKind ? (
          <View
            style={[
              styles.syncBanner,
              {
                backgroundColor:
                  bannerKind === 'session' ? '#DC2626' : '#F59E0B',
              },
            ]}
          >
            <View style={styles.syncBannerIcon}>
              <AlertCircle color="#FFFFFF" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncBannerTitle}>
                {bannerKind === 'session'
                  ? 'Session expired'
                  : 'Sync issue'}
              </Text>
              <Text style={styles.syncBannerSub} numberOfLines={3}>
                {syncError}
              </Text>
            </View>

            {bannerKind === 'session' ? (
              <TouchableOpacity
                onPress={handleRelogin}
                style={styles.syncBannerBtn}
                activeOpacity={0.85}
              >
                <LogIn color="#FFFFFF" size={13} strokeWidth={3} />
                <Text style={styles.syncBannerBtnText}>Log in</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleRetry}
                style={styles.syncBannerBtn}
                activeOpacity={0.85}
              >
                <RotateCcw color="#FFFFFF" size={13} strokeWidth={3} />
                <Text style={styles.syncBannerBtnText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <MoodCheckInCard />

        <UpNextCard
          nextTask={nextTask}
          onStartFocus={handleStartFocus}
          isDark={isDark}
        />

        <View style={styles.metricsRow}>
          <MetricPill
            icon={Clock3}
            value={`${focusMinutesToday}m`}
            label="Focus"
            gradient={['#A78BFA', '#7C3AED']}
          />
          <MetricPill
            icon={Leaf}
            value={habitTarget > 0 ? `${habitDone}/${habitTarget}` : '0'}
            label="Habits"
            gradient={['#34D399', '#059669']}
            progress={habitProgress}
          />
          <MetricPill
            icon={Flame}
            value={String(stats?.streakDays || 0)}
            label="Streak"
            gradient={['#FB923C', '#EA580C']}
          />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Chatbot')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isDark ? ['#5B21B6', '#1D4ED8'] : ['#7C3AED', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroChatCard}
          >
            <View style={styles.heroChatIconWrap}>
              <MessageCircle color="#FFFFFF" size={22} />
            </View>
            <View style={styles.heroChatText}>
              <Text style={styles.heroChatTitle}>Talk to your AI coach</Text>
              <Text style={styles.heroChatSub}>
                Plan your day, get unstuck, or just talk
              </Text>
            </View>
            <ChevronRight color="#FFFFFF" size={20} />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          YOUR ASSESSMENTS
        </Text>
        <View style={styles.assessmentRow}>
          <AssessmentCard
            title="ADHD Screening"
            subtitle={adhdSubtitle}
            taken={adhdTaken}
            gradient={['#8B5CF6', '#6366F1']}
            icon={Sparkles}
            onPrimary={() =>
              adhdTaken
                ? navigation.navigate('AssessmentResult')
                : navigation.navigate('Questionnaire')
            }
            onRetake={
              adhdTaken ? () => navigation.navigate('Questionnaire') : null
            }
          />
          <AssessmentCard
            title="Executive Function"
            subtitle={efSubtitle}
            taken={efTaken}
            gradient={['#06B6D4', '#0891B2']}
            icon={Target}
            onPrimary={() =>
              efTaken
                ? navigation.navigate('EFAssessmentResult')
                : navigation.navigate('EFQuestionnaire')
            }
            onRetake={
              efTaken ? () => navigation.navigate('EFQuestionnaire') : null
            }
          />
        </View>

        <FocusSessionScheduler navigation={navigation} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 120,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingWrap: { flex: 1, marginRight: 8 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileBtnImage: { width: 44, height: 44, borderRadius: 22 },
  greetingText: { flex: 1 },
  greeting: { fontSize: 14, fontWeight: '600', opacity: 0.7 },
  greetingName: { fontSize: 22, fontWeight: '800', marginTop: -2 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Sync / session banner
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  syncBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  syncBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  syncBannerSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 15,
  },
  syncBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    flexShrink: 0,
  },
  syncBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  // Up Next
  upNextCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  upNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  upNextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  upNextBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  upNextStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  upNextStartText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  upNextTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 10,
  },
  upNextSubRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
    paddingLeft: 4,
  },
  upNextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FCD34D',
    marginTop: 6,
  },
  upNextSubText: {
    flex: 1,
    color: '#F5F3FF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  upNextProgressBlock: { marginBottom: 14 },
  upNextProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  upNextProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FCD34D',
  },
  upNextProgressLabel: {
    color: '#F5F3FF',
    fontSize: 11,
    fontWeight: '700',
  },
  upNextMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  upNextMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  upNextMetaText: {
    color: '#F5F3FF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  allClearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  allClearTitle: { fontSize: 20, fontWeight: '800' },
  allClearSub: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metricPillWrap: { flex: 1 },
  metricPill: {
    borderRadius: 18,
    padding: 14,
    alignItems: 'flex-start',
    gap: 4,
    minHeight: 92,
  },
  metricPillValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  metricPillLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  metricPillTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 6,
    overflow: 'hidden',
  },
  metricPillFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },

  heroChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 22,
    gap: 14,
  },
  heroChatIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChatText: { flex: 1 },
  heroChatTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroChatSub: { color: '#EDE9FE', fontSize: 12, fontWeight: '500' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginLeft: 2,
  },

  assessmentRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  assessWrap: { flex: 1 },
  assessCard: {
    borderRadius: 20,
    padding: 16,
    minHeight: 168,
    justifyContent: 'space-between',
  },
  assessTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  assessIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  doneBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  assessTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
    marginBottom: 6,
  },
  assessSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginBottom: 12,
    flex: 1,
  },
  assessCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  assessCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  assessRetake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    marginTop: 6,
  },
  assessRetakeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});