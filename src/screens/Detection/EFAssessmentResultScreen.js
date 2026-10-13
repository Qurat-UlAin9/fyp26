import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { EF_DIMENSIONS_META } from '../../data/efQuestions';

// Fixed hues so each dimension reads distinct on every theme
const DIMENSION_ACCENTS = {
  SistemaAtencionalSupervisor: '#8B5CF6',
  RegulacionDeliberadaEmocion: '#EC4899',
  MonitorizacionConscieteResponsabilidades: '#06B6D4',
  Verificaciondelaconducta: '#F59E0B',
  Organizacionelemnetostareas: '#10B981',
  Controlinhibitorio: '#EF4444',
  tomadedecisiones: '#6366F1',
};

const DIMENSION_ICONS = {
  SistemaAtencionalSupervisor: 'eye',
  RegulacionDeliberadaEmocion: 'heart',
  MonitorizacionConscieteResponsabilidades: 'clipboard',
  Verificaciondelaconducta: 'checkmark-done',
  Organizacionelemnetostareas: 'albums',
  Controlinhibitorio: 'hand-left',
  tomadedecisiones: 'git-branch',
};

function scoreLabel(pct) {
  if (pct >= 70) return 'Strong';
  if (pct >= 45) return 'Moderate';
  return 'Needs attention';
}

export default function EFAssessmentResultScreen({ navigation, route }) {
  const { theme, isDark } = useTheme();
  const dimensionScores = route?.params?.dimensionScores || {};

  const entries = useMemo(() => {
    return Object.entries(dimensionScores).map(([key, score]) => {
      const meta = EF_DIMENSIONS_META[key] || {};
      const pct = Math.round(score?.normalized0to100 ?? 0);
      return {
        key,
        label: meta.label || key,
        status: meta.status || score?.status || 'partial',
        pct,
        rawScore: score?.rawScore ?? 0,
        theoreticalMax: score?.theoreticalMax ?? 0,
        nItems: score?.nItems ?? 0,
        note: score?.note || null,
        accent: DIMENSION_ACCENTS[key] || theme.accentGradient[0],
        icon: DIMENSION_ICONS[key] || 'analytics',
      };
    });
  }, [dimensionScores, theme.accentGradient]);

  // Overall average across dimensions (informational only)
  const overallAvg = useMemo(() => {
    if (entries.length === 0) return 0;
    const sum = entries.reduce((acc, e) => acc + e.pct, 0);
    return Math.round(sum / entries.length);
  }, [entries]);

  const overallAccent = theme.accentGradient[0];

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Text style={[styles.title, { color: theme.text }]}>Executive Function Profile</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your responses across the 7 UEF-1 dimensions. This is a supportive insight — not a diagnosis.
          </Text>

          {/* Overview card */}
          <LinearGradient
            colors={[theme.accentGradient[0], theme.accentGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewCard}
          >
            <View style={styles.overviewTop}>
              <View>
                <Text style={styles.overviewLabel}>OVERALL PROFILE</Text>
                <View style={styles.overviewValueRow}>
                  <Text style={styles.overviewValue}>{overallAvg}</Text>
                  <Text style={styles.overviewValueSuffix}>%</Text>
                </View>
                <Text style={styles.overviewSub}>
                  averaged across {entries.length} dimension{entries.length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.overviewBadge}>
                <Ionicons name="pulse" size={22} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>exact recovery</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>approximate (partial)</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Dimensions */}
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 22 }]}>
            Your dimensions
          </Text>

          {entries.map((d) => {
            const isPartial = d.status === 'partial';
            const badgeColor = isPartial ? '#F59E0B' : '#10B981';
            const barColor = d.accent;

            return (
              <View
                key={d.key}
                style={[
                  styles.dimensionCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.dimHeader}>
                  <View
                    style={[
                      styles.dimIconWrap,
                      { backgroundColor: barColor + '22' },
                    ]}
                  >
                    <Ionicons name={d.icon} size={18} color={barColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dimLabel, { color: theme.text }]} numberOfLines={2}>
                      {d.label}
                    </Text>
                    <View style={styles.dimMetaRow}>
                      <View style={[styles.dimBadge, { backgroundColor: badgeColor + '22' }]}>
                        <View style={[styles.dimBadgeDot, { backgroundColor: badgeColor }]} />
                        <Text style={[styles.dimBadgeText, { color: badgeColor }]}>
                          {isPartial ? 'APPROXIMATE' : 'EXACT'}
                        </Text>
                      </View>
                      <Text style={[styles.dimMeta, { color: theme.textSecondary }]}>
                        {d.nItems} items · raw {d.rawScore}/{d.theoreticalMax}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${d.pct}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>

                <View style={styles.dimFooter}>
                  <Text style={[styles.dimPct, { color: barColor }]}>{d.pct}%</Text>
                  <Text style={[styles.dimScoreLabel, { color: theme.textSecondary }]}>
                    {scoreLabel(d.pct)}
                  </Text>
                </View>

                {isPartial && d.note ? (
                  <Text
                    style={[styles.dimNote, { color: theme.textSecondary }]}
                    numberOfLines={3}
                  >
                    {d.note}
                  </Text>
                ) : null}
              </View>
            );
          })}

          {/* Disclaimer */}
          <View
            style={[
              styles.disclaimerCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Ionicons name="information-circle" size={18} color={overallAccent} />
            <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
              This measures self-reported executive-function tendencies only. It is not a
              clinical assessment and cannot diagnose ADHD or any other condition.
              Discuss any concerns with a qualified professional.
            </Text>
          </View>

          {/* Home button */}
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

  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { marginTop: 6, fontSize: 13.5, lineHeight: 20, fontWeight: '500' },

  overviewCard: {
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  overviewLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  overviewValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  overviewValue: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  overviewValueSuffix: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 2,
  },
  overviewSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  overviewBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },

  dimensionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  dimHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  dimIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dimLabel: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  dimMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  dimBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dimBadgeDot: { width: 5, height: 5, borderRadius: 3 },
  dimBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  dimMeta: { fontSize: 10.5, fontWeight: '600' },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 4 },

  dimFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  dimPct: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  dimScoreLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  dimNote: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
    opacity: 0.85,
  },

  disclaimerCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },

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