import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

function getRiskLabel(percentage) {
  if (percentage >= 70) return 'High likelihood';
  if (percentage >= 45) return 'Moderate likelihood';
  return 'Low likelihood';
}

export default function AssessmentResultScreen({ navigation, route }) {
  const { isDark } = useTheme();

  const score = route?.params?.score ?? 0;
  const maxScore = route?.params?.maxScore ?? 72;
  const percentage = route?.params?.percentage ?? 0;
  const answeredCount = route?.params?.answeredCount ?? 0;
  const totalQuestions = route?.params?.totalQuestions ?? 18;
  const predictedLabel = route?.params?.predictedLabel ?? 'Unknown';
  const adhdProbability = route?.params?.adhdProbability ?? 0;
  const topFactors = route?.params?.topFactors ?? [];
  const riskLabel = getRiskLabel(percentage);

  return (
    <LinearGradient
      colors={isDark ? ['#0B1028', '#1E1B4B', '#1E3A8A'] : ['#F8FAFF', '#EEF2FF', '#E0E7FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Screening Summary</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#CBD5E1' : '#475569' }]}>This is a supportive screening insight, not a clinical diagnosis.</Text>

          <LinearGradient
            colors={isDark ? ['#312E81', '#1D4ED8'] : ['#C7D2FE', '#BFDBFE']}
            style={styles.scoreCard}
          >
            <Text style={styles.scoreLabel}>ADHD Score</Text>
            <Text style={styles.scoreValue}>{score} / {maxScore}</Text>
            <Text style={styles.scorePct}>{percentage}% • {riskLabel}</Text>
            <Text style={styles.scorePrediction}>
              Model output: {predictedLabel} ({Math.round(adhdProbability * 100)}%)
            </Text>
          </LinearGradient>

          <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(15,23,42,0.68)' : '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>Why the system predicted this</Text>
            <Text style={[styles.bodyText, { color: isDark ? '#CBD5E1' : '#475569' }]}>• You answered {answeredCount} of {totalQuestions} questions, with frequent responses around inattention and task completion difficulties.</Text>
            <Text style={[styles.bodyText, { color: isDark ? '#CBD5E1' : '#475569' }]}>• In the backend, SHAP analysis will show which responses contributed most to this score for transparent explanations.</Text>
            <Text style={[styles.bodyText, { color: isDark ? '#CBD5E1' : '#475569' }]}>• Final interpretation should always be confirmed with a qualified healthcare professional.</Text>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: isDark ? 'rgba(15,23,42,0.68)' : '#FFFFFF' }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>Top influencing factors (SHAP)</Text>
            {topFactors.length === 0 ? (
              <Text style={[styles.bodyText, { color: isDark ? '#CBD5E1' : '#475569' }]}>No factor details were returned by backend.</Text>
            ) : (
              topFactors.map((factor, index) => (
                <Text key={`${factor.feature}-${index}`} style={[styles.bodyText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                  • {index + 1}. {factor.question} (impact: {factor.impact.toFixed(4)})
                </Text>
              ))
            )}
          </View>
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
  title: { fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  scoreCard: {
    marginTop: 20,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 18,
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  scoreLabel: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  scoreValue: { marginTop: 8, color: '#FFFFFF', fontSize: 38, fontWeight: '900' },
  scorePct: { marginTop: 6, color: '#DBEAFE', fontSize: 17, fontWeight: '700' },
  scorePrediction: { marginTop: 8, color: '#E0E7FF', fontSize: 14, fontWeight: '600' },
  sectionCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  bodyText: { fontSize: 14, lineHeight: 22, marginBottom: 8, fontWeight: '500' },
  buttonWrap: { borderRadius: 16, overflow: 'hidden' },
  button: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
