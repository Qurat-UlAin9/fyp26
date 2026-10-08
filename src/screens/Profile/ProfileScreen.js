import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  Settings as SettingsIcon,
  LogOut,
  Brain,
  ClipboardList,
  ChevronRight,
  User as UserIcon,
  Coins,
  Trophy,
  CheckCircle2,
  Target,
  Clock,
  Flame,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';
import {
  getLatestADHDAssessment,
  getLatestEFAssessment,
} from '../../services/api';
import { EF_DIMENSIONS_META } from '../../data/efQuestions';

function riskLabel(percentage) {
  if (percentage >= 70) return 'High likelihood';
  if (percentage >= 45) return 'Moderate likelihood';
  return 'Low likelihood';
}

// Big colored stat tile
function StatTile({ icon: Icon, label, value, gradient }) {
  return (
    <View style={styles.statTileWrap}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statTile}
      >
        <Icon color="#FFFFFF" size={18} />
        <Text style={styles.statTileValue}>{value}</Text>
        <Text style={styles.statTileLabel} numberOfLines={1}>
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
}

function InfoCard({ icon: Icon, title, theme, iconColor, children }) {
  const iconBg = iconColor + '22';
  return (
    <View
      style={[
        styles.infoCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.infoHeader}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>
          <Icon color={iconColor} size={18} />
        </View>
        <Text style={[styles.infoTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function LinkRow({ label, onPress, theme, accent }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.linkRow} activeOpacity={0.7}>
      <Text style={[styles.linkText, { color: accent }]}>{label}</Text>
      <ChevronRight color={accent} size={16} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const { theme, isDark, stats, coins, titles } = useTheme();
  const { profile, tasks, habits, focusSessions } = useAppData();
  const { height } = useWindowDimensions();
  const bannerHeight = Math.max(260, Math.round(height * 0.32));

  const [adhdResult, setAdhdResult] = useState(null);
  const [efResult, setEfResult] = useState(null);
  const [loadingAssessments, setLoadingAssessments] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [adhd, ef] = await Promise.all([
          getLatestADHDAssessment().catch(() => null),
          getLatestEFAssessment().catch(() => null),
        ]);
        if (!cancelled) {
          setAdhdResult(adhd);
          setEfResult(ef);
        }
      } finally {
        if (!cancelled) setLoadingAssessments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completedTasks = stats.tasksCompleted;
  const onTimeRate = completedTasks
    ? Math.round((completedTasks / (completedTasks + tasks.length)) * 100)
    : 0;
  const achieved = titles.filter((t) => t.unlocked).length;

  const insight = useMemo(() => {
    if (stats.focusMinutes > 120)
      return 'Great momentum: your focus routine is becoming consistent.';
    if (habits.length > 0)
      return 'Nice progress: habit consistency will improve your executive function over time.';
    return 'Start by adding 1 task and 1 habit today to build a steady rhythm.';
  }, [stats.focusMinutes, habits.length]);

  const avatarSource = profile.avatarUrl ? { uri: profile.avatarUrl } : null;
  const accent = theme.accentGradient?.[0] || '#8B5CF6';

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
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Banner ── */}
        <LinearGradient
          colors={[theme.accentGradient[0], theme.accentGradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.banner, { height: bannerHeight }]}
        >
          <View style={styles.bannerTop}>
            <Text style={styles.bannerLabel}>PROFILE</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              style={styles.iconBtn}
            >
              <SettingsIcon color="#fff" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.bannerBottom}>
            <View style={styles.bannerIdentity}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.bannerAvatar} />
              ) : (
                <View style={[styles.bannerAvatar, styles.bannerAvatarFallback]}>
                  <UserIcon color="#fff" size={28} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerName} numberOfLines={1}>
                  {profile.name || 'Friend'}
                </Text>
                {profile.email ? (
                  <Text style={styles.bannerEmail} numberOfLines={1}>
                    {profile.email}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditProfile')}
                style={styles.editBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Mood: {profile.mood}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>ADHD: {profile.adhdScreening}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Content ── */}
        <View style={styles.body}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatTile
              icon={Coins}
              label="Coins"
              value={coins}
              gradient={['#F59E0B', '#F97316']}
            />
            <StatTile
              icon={Trophy}
              label="Achievements"
              value={achieved}
              gradient={['#8B5CF6', '#6366F1']}
            />
            <StatTile
              icon={CheckCircle2}
              label="Completed"
              value={completedTasks}
              gradient={['#10B981', '#059669']}
            />
            <StatTile
              icon={Target}
              label="Focus"
              value={focusSessions.length}
              gradient={['#A78BFA', '#7C3AED']}
            />
            <StatTile
              icon={Clock}
              label="On-time"
              value={`${onTimeRate}%`}
              gradient={['#06B6D4', '#0891B2']}
            />
            <StatTile
              icon={Flame}
              label="Streak"
              value={stats.habitStreak}
              gradient={['#EF4444', '#DC2626']}
            />
          </View>

          {/* Insight */}
          <InfoCard
            icon={Brain}
            title="Personalized insight"
            theme={theme}
            iconColor="#8B5CF6"
          >
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
              {insight}
            </Text>
          </InfoCard>

          {/* ADHD screening */}
          <InfoCard
            icon={ClipboardList}
            title="ADHD Screening"
            theme={theme}
            iconColor="#EC4899"
          >
            {loadingAssessments ? (
              <ActivityIndicator
                style={{ marginTop: 10 }}
                color={accent}
              />
            ) : adhdResult ? (
              <>
                <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                  {riskLabel(adhdResult.percentage)} · {adhdResult.percentage}% (
                  {adhdResult.score}/{adhdResult.max_score})
                </Text>
                <LinkRow
                  label="Retake screening"
                  theme={theme}
                  accent={accent}
                  onPress={() => navigation.navigate('Questionnaire')}
                />
              </>
            ) : (
              <>
                <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                  You haven't completed the ADHD screening yet.
                </Text>
                <LinkRow
                  label="Start screening"
                  theme={theme}
                  accent={accent}
                  onPress={() => navigation.navigate('Questionnaire')}
                />
              </>
            )}
          </InfoCard>

          {/* EF */}
          <InfoCard
            icon={Brain}
            title="Executive Function"
            theme={theme}
            iconColor="#06B6D4"
          >
            {loadingAssessments ? (
              <ActivityIndicator
                style={{ marginTop: 10 }}
                color={accent}
              />
            ) : efResult ? (
              <>
                {Object.entries(efResult.dimension_scores || {}).map(
                  ([name, score]) => (
                    <View key={name} style={styles.efRow}>
                      <View
                        style={[
                          styles.efDot,
                          { backgroundColor: accent },
                        ]}
                      />
                      <Text
                        style={[styles.efLine, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {EF_DIMENSIONS_META[name]?.label ?? name}
                      </Text>
                      <Text style={[styles.efPct, { color: theme.text }]}>
                        {Math.round(score.normalized0to100)}%
                      </Text>
                    </View>
                  )
                )}
                <LinkRow
                  label="Retake assessment"
                  theme={theme}
                  accent={accent}
                  onPress={() => navigation.navigate('EFQuestionnaire')}
                />
              </>
            ) : (
              <>
                <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                  You haven't completed the Executive Function assessment yet.
                </Text>
                <LinkRow
                  label="Start assessment"
                  theme={theme}
                  accent={accent}
                  onPress={() => navigation.navigate('EFQuestionnaire')}
                />
              </>
            )}
          </InfoCard>

          {/* Rewards */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Rewards')}
            activeOpacity={0.85}
            style={styles.primaryBtnWrap}
          >
            <LinearGradient
              colors={[theme.accentGradient[0], theme.accentGradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Award color="#fff" size={18} />
              <Text style={styles.primaryBtnText}>View Rewards</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity
            onPress={() => navigation.replace('Login')}
            style={styles.logoutLink}
          >
            <LogOut size={15} color={theme.textSecondary} />
            <Text style={[styles.logoutText, { color: theme.textSecondary }]}>
              Log out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },

  // Banner
  banner: {
    width: '100%',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 44,
  },
  bannerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBottom: { paddingHorizontal: 20, paddingBottom: 20 },
  bannerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bannerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  bannerAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  bannerEmail: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12.5,
    marginTop: 3,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  body: { paddingHorizontal: 20, marginTop: 16 },

  // Stat tiles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statTileWrap: {
    width: '31.5%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  statTile: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    minHeight: 92,
    justifyContent: 'space-between',
    borderRadius: 16,
  },
  statTileValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  statTileLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Info cards
  infoCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  bodyText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },

  // EF rows
  efRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  efDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.7 },
  efLine: { flex: 1, fontSize: 12.5, fontWeight: '600' },
  efPct: { fontSize: 12.5, fontWeight: '900' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  linkText: { fontSize: 13, fontWeight: '800' },

  // Primary button
  primaryBtnWrap: { marginTop: 8, borderRadius: 16, overflow: 'hidden' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  logoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  logoutText: { fontSize: 13, fontWeight: '700' },
});