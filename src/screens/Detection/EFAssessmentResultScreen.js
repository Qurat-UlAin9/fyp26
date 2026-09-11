import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { EF_DIMENSIONS_META } from '../../data/efQuestions';

// Fixed display order -- doesn't need to match questionnaire item order.
const DIMENSION_ORDER = [
  'SistemaAtencionalSupervisor',
  'RegulacionDeliberadaEmocion',
  'MonitorizacionConscieteResponsabilidades',
  'Verificaciondelaconducta',
  'Organizacionelemnetostareas',
  'Controlinhibitorio',
  'tomadedecisiones',
];

function DimensionBar({ name, score, isDark }) {
  const meta = EF_DIMENSIONS_META[name];
  const pct = Math.max(0, Math.min(100, score?.normalized0to100 ?? 0));
  const isExact = score?.status === 'exact';

  return (
    <View style={[styles.dimCard, { backgroundColor: isDark ? 'rgba(15,23,42,0.68)' : '#FFFFFF' }]}>
      <View style={styles.dimHeaderRow}>
        <Text style={[styles.dimTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>{meta?.label ?? name}</Text>
        <View style={[styles.badge, isExact ? styles.badgeExact : styles.badgePartial]}>
          <Text style={styles.badgeText}>{isExact ? 'Validated' : 'Approximate'}</Text>
        </View>
      </View>

      <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(99,102,241,0.14)' }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: isDark ? '#60A5FA' : '#6366F1' }]} />
      </View>

      <Text style={[styles.dimMeta, { color: isDark ? '#94A3B8' : '#64748B' }]}>
        {score?.rawScore ?? 0} / {score?.theoreticalMax ?? 0} • {pct.toFixed(0)}%
      </Text>

      {!isExact ? (
        <Text style={[styles.dimNote, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          This dimension is a close approximation -- 1-2 contributing items from the
          original scale aren't available in this version, so the score may read a
          little lower than expected.
        </Text>
      ) : null}
    </View>
  );
}

export default function EFAssessmentResultScreen({ navigation, route }) {
  const { isDark } = useTheme();
  const dimensionScores = route?.params?.dimensionScores ?? {};

  return (
    <LinearGradient
      colors={isDark ? ['#0B1028', '#1E1B4B', '#1E3A8A'] : ['#F8FAFF', '#EEF2FF', '#E0E7FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            Executive Function Summary
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#CBD5E1' : '#475569' }]}>
            This reflects your self-reported tendencies across seven executive
            function areas. It is not a diagnosis of ADHD or any other condition.
          </Text>

          {DIMENSION_ORDER.map((name) => (
            <DimensionBar key={name} name={name} score={dimensionScores[name]} isDark={isDark} />
          ))}
        </ScrollView>

        <Pressable onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })} style={styles.buttonWrap}>
          <LinearGradient colors={isDark ? ['#5B21B6', '#2563EB'] : ['#7C3AED', '#6366F1']} style={styles.button}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  content: { paddingTop: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, fontWeight: '500', marginBottom: 8 },
  dimCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  dimHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dimTitle: { fontSize: 15, fontWeight: '800', flexShrink: 1, paddingRight: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeExact: { backgroundColor: '#16A34A' },
  badgePartial: { backgroundColor: '#F59E0B' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  barTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  dimMeta: { marginTop: 6, fontSize: 13, fontWeight: '600' },
  dimNote: { marginTop: 8, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  buttonWrap: { borderRadius: 16, overflow: 'hidden' },
  button: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
