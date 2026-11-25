import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ClipboardList, Brain } from 'lucide-react-native';
import ADHDButton from '../../components/common/ADHDButton';
import { useTheme } from '../../contexts/ThemeContext';

export default function WelcomeScreen({ navigation }) {
  const { theme } = useTheme();
  const accent = theme.accentGradient?.[0] || '#8B5CF6';

  const goToADHDAssessment = () => {
    navigation.navigate('Questionnaire');
  };

  const goToEFAssessment = () => {
    navigation.navigate('EFQuestionnaire');
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <LinearGradient
        colors={[theme.accentGradient[0], theme.accentGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Sparkles color="#FFFFFF" size={26} />
        <Text style={styles.heroTitle}>Welcome to FocusMind</Text>
        <Text style={styles.heroText}>
          Let's personalize your journey. A couple of quick assessments help tailor your experience.
        </Text>
      </LinearGradient>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={goToADHDAssessment}
        style={[styles.assessmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <ClipboardList color={accent} size={22} />
        <View style={styles.assessmentCopy}>
          <Text style={[styles.assessmentTitle, { color: theme.text }]}>ADHD Screening</Text>
          <Text style={[styles.assessmentSubtitle, { color: theme.textSecondary }]}>2-3 minutes • Understand your needs</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={goToEFAssessment}
        style={[styles.assessmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Brain color={accent} size={22} />
        <View style={styles.assessmentCopy}>
          <Text style={[styles.assessmentTitle, { color: theme.text }]}>Executive Function Assessment</Text>
          <Text style={[styles.assessmentSubtitle, { color: theme.textSecondary }]}>5-7 minutes • Attention, organization, and more</Text>
        </View>
      </TouchableOpacity>

      <ADHDButton title="Start ADHD Screening" onPress={goToADHDAssessment} style={styles.primaryButton} />
      <ADHDButton title="Continue to Home" gradient={false} onPress={() => navigation.replace('MainTabs')} />
    </LinearGradient>
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
    color: 'rgba(255,255,255,0.9)',
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
    marginBottom: 14,
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
    marginTop: 4,
    marginBottom: 12,
  },
});
