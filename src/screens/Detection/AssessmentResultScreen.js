import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import CircularProgress from '../../components/detection/CircularProgress';

function getRiskLabel(percentage) {
  if (percentage >= 70) return { label: 'High likelihood', color: '#EF4444', icon: 'alert-circle' };
  if (percentage >= 45) return { label: 'Moderate likelihood', color: '#F59E0B', icon: 'warning' };
  return { label: 'Low likelihood', color: '#10B981', icon: 'checkmark-circle' };
}

export default function AssessmentResultScreen({ navigation, route }) {
  const { theme, isDark } = useTheme();

  const score = route?.params?.score ?? 0;
  const maxScore = route?.params?.maxScore ?? 72;
  const percentage = route?.params?.percentage ?? 0;
  const answeredCount = route?.params?.answeredCount ?? 0;
  const totalQuestions = route?.params?.totalQuestions ?? 18;
  const predictedLabel = route?.params?.predictedLabel ?? 'Unknown';
  const adhdProbability = route?.params?.adhdProbability ?? 0;
  const topFactors = route?.params?.topFactors ?? [];

  const risk = getRiskLabel(percentage);
  const accent = theme.accentGradient?.[0] || '#8B5CF6';

  // Impact magnitudes for mini bars in SHAP section
  const maxImpact = topFactors.length
    ? Math.max(...topFactors.map((f) => Math.abs(f.impact ?? 0)))
    : 1;

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Text style={[styles.title, { color: theme.text }]}>Screening Summary</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            A supportive insight — not a clinical diagnosis.
          </Text>

          {/* Hero score card */}
          <LinearGradient
            colors={[theme.accentGradient[0], theme.accentGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreCard}
          >
            <View style={styles.scoreCardInner}>
              <View style={styles.scoreLeft}>
                <Text style={styles.scoreLabel}>ADHD SCORE</Text>
                <View style={styles.bigScoreRow}>
                  <Text style={styles.bigScore}>{score}</Text>
                  <Text style={styles.bigScoreMax}> / {maxScore}</Text>
                </View>
                <View style={styles.riskRow}>
                  <Ionicons name={risk.icon} size={14} color="#FFFFFF" />
                  <Text style={styles.riskText}>{risk.label}</Text>
                </View>
                <Text style={styles.modelLine}>
                  Model: {predictedLabel} · {Math.round(adhdProbability * 100)}%
                </Text>
              </View>

              <View style={styles.scoreRight}>
                <CircularProgress
                  answered={Math.round(percentage)}
                  total={100}
                  size={110}
                  thickness={9}
                  isDark={isDark}
                  accent="#FFFFFF"
                  label="SCORE"
                />
              </View>
            </View>
          </LinearGradient>

          {/* Why section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: accent + '22' }]}>
                <Ionicons name="information-circle" size={18} color={accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Why the system predicted this
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: accent }]} />
              <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                You answered <Text style={styles.bodyBold}>{answeredCount}</Text> of{' '}
                <Text style={styles.bodyBold}>{totalQuestions}</Text> questions, with frequent responses around inattention and task completion difficulties.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: accent }]} />
              <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                The backend uses SHAP analysis to identify which specific responses most influenced this score, for transparent explanations.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                Final interpretation should always be confirmed with a qualified healthcare professional.
              </Text>
            </View>
          </View>

          {/* SHAP factors */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: '#F59E0B22' }]}>
                <Ionicons name="analytics" size={18} color="#F59E0B" />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Top influencing factors (SHAP)
              </Text>
            </View>

            {topFactors.length === 0 ? (
              <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                No factor details were returned by the backend.
              </Text>
            ) : (
              topFactors.map((factor, index) => {
                const impact = factor.impact ?? 0;
                const magnitude = maxImpact > 0 ? Math.min(1, Math.abs(impact) / maxImpact) : 0;
                const positive = impact >= 0;
                const barColor = positive ? accent : '#EF4444';

                return (
                  <View key={`${factor.feature}-${index}`} style={styles.factorRow}>
                    <View
                      style={[
                        styles.factorRank,
                        { backgroundColor: index === 0 ? accent : theme.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.factorRankText,
                          { color: index === 0 ? '#FFFFFF' : theme.textSecondary },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.factorBody}>
                      <Text
                        style={[styles.factorQuestion, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {factor.question}
                      </Text>
                      <View
                        style={[
                          styles.factorBarTrack,
                          { backgroundColor: theme.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.factorBarFill,
                            { width: `${magnitude * 100}%`, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                      <Text
                        style={[styles.factorImpact, { color: theme.textSecondary }]}
                      >
                        impact {impact.toFixed(4)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Back to home */}
          <Pressable
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
            style={styles.buttonWrap}
          >
            <LinearGradient
              colors={[theme.accentGradient[0], theme.accentGradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Ionicons name="home" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Go to Home</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 14, lineHeight: 20, fontWeight: '500' },

  scoreCard: {
    marginTop: 22,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  scoreCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLeft: { flex: 1, paddingRight: 10 },
  scoreLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  bigScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  bigScore: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  bigScoreMax: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '700',
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  riskText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modelLine: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  scoreRight: { alignItems: 'center', justifyContent: 'center' },

  sectionCard: {
    marginTop: 18,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', flex: 1 },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bodyText: { flex: 1, fontSize: 13.5, lineHeight: 20, fontWeight: '500' },
  bodyBold: { fontWeight: '900' },

  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.2)',
  },
  factorRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  factorRankText: { fontSize: 12, fontWeight: '900' },
  factorBody: { flex: 1 },
  factorQuestion: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 6,
  },
  factorBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  factorBarFill: { height: '100%', borderRadius: 3 },
  factorImpact: { fontSize: 11, fontWeight: '600' },

  buttonWrap: { marginTop: 22, borderRadius: 18, overflow: 'hidden' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});