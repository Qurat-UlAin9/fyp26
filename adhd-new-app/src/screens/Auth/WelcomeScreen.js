import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ClipboardList } from 'lucide-react-native';
import ADHDButton from '../../components/common/ADHDButton';
import { useTheme } from '../../contexts/ThemeContext';

export default function WelcomeScreen({ navigation }) {
  const { theme, isDark } = useTheme();

  const goToAssessment = () => {
    navigation.navigate('Questionnaire');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#EEF2FF' }]}>
      <LinearGradient
        colors={isDark ? ['#312E81', '#1D4ED8'] : ['#A5B4FC', '#7DD3FC']}
        style={styles.heroCard}
      >
        <Sparkles color="#FFFFFF" size={26} />
        <Text style={styles.heroTitle}>Welcome to FocusMind</Text>
        <Text style={styles.heroText}>
          Let's personalize your journey. A quick assessment helps tailor your experience.
        </Text>
      </LinearGradient>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={goToAssessment}
        style={[styles.assessmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <ClipboardList color={theme.primary} size={22} />
        <View style={styles.assessmentCopy}>
          <Text style={[styles.assessmentTitle, { color: theme.text }]}>Start Assessment</Text>
          <Text style={[styles.assessmentSubtitle, { color: theme.textSecondary }]}>2-3 minutes • Understand your needs</Text>
        </View>
      </TouchableOpacity>

      <ADHDButton title="Start Assessment" onPress={goToAssessment} style={styles.primaryButton} />
      <ADHDButton title="Continue to Home" gradient={false} onPress={() => navigation.replace('MainTabs')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 26,
    padding: 24,
    marginBottom: 22,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 28,
    marginTop: 12,
  },
  heroText: {
    color: '#E0E7FF',
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
  },
  assessmentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  assessmentCopy: {
    marginLeft: 12,
    flex: 1,
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  assessmentSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    marginBottom: 12,
  },
});
