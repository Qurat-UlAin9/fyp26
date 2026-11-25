import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { reframeThought, getReframeHistory, deleteReframe } from '../../services/api';

const MAX_LEN = 1000;
const EXAMPLES = [
  "I always mess everything up.",
  "Everyone will think I'm stupid if I ask.",
  "I'll never catch up, so why even start?",
];

function Section({ icon, title, color, theme, children }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Bullet({ text, color, theme }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: color }]} />
      <Text style={[styles.body, { color: theme.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

function ResultView({ result, theme, accent, onRefine, refining }) {
  const [feedback, setFeedback] = useState('');
  const hasEvidence = result.evidence?.for?.length || result.evidence?.against?.length;

  return (
    <View>
      {result.validation ? (
        <Text style={[styles.validation, { color: theme.text }]}>{result.validation}</Text>
      ) : null}

      <Section icon="chatbubble-ellipses" title="The thought" color="#8B5CF6" theme={theme}>
        <Text style={[styles.body, { color: theme.text }]}>“{result.thought}”</Text>
      </Section>

      {result.distortions?.length ? (
        <Section icon="eye" title="Thinking traps in it" color="#F59E0B" theme={theme}>
          {result.distortions.map((d) => (
            <View key={d.name} style={styles.distortion}>
              <Text style={[styles.distortionName, { color: theme.text }]}>{d.name}</Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>{d.why}</Text>
            </View>
          ))}
        </Section>
      ) : null}

      {result.questions?.length ? (
        <Section icon="help-circle" title="Questions to test it" color="#06B6D4" theme={theme}>
          {result.questions.map((q, i) => (
            <Bullet key={i} text={q} color="#06B6D4" theme={theme} />
          ))}
        </Section>
      ) : null}

      {hasEvidence ? (
        <Section icon="scale" title="What the evidence says" color="#6366F1" theme={theme}>
          {result.evidence.for?.length ? (
            <>
              <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Supports the thought</Text>
              {result.evidence.for.map((t, i) => <Bullet key={`f${i}`} text={t} color="#EF4444" theme={theme} />)}
            </>
          ) : null}
          {result.evidence.against?.length ? (
            <>
              <Text style={[styles.subLabel, { color: theme.textSecondary, marginTop: 8 }]}>Questions the thought</Text>
              {result.evidence.against.map((t, i) => <Bullet key={`a${i}`} text={t} color="#10B981" theme={theme} />)}
            </>
          ) : null}
        </Section>
      ) : null}

      <LinearGradient
        colors={[theme.accentGradient[0], theme.accentGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanced}
      >
        <Text style={styles.balancedLabel}>A more balanced thought</Text>
        <Text style={styles.balancedText}>{result.balanced}</Text>
      </LinearGradient>

      {result.action ? (
        <Section icon="footsteps" title="One tiny step" color="#10B981" theme={theme}>
          <Text style={[styles.body, { color: theme.text }]}>{result.action}</Text>
        </Section>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Doesn't feel right?</Text>
        <Text style={[styles.body, { color: theme.textSecondary, marginBottom: 8 }]}>
          Tell me what is off and I'll try another angle.
        </Text>
        <TextInput
          style={[styles.smallInput, { color: theme.text, borderColor: theme.border }]}
          placeholder="e.g. It sounds too positive"
          placeholderTextColor={theme.textSecondary}
          value={feedback}
          onChangeText={setFeedback}
          maxLength={300}
        />
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: accent, opacity: refining ? 0.6 : 1 }]}
          onPress={() => onRefine(feedback.trim())}
          disabled={refining}
          activeOpacity={0.8}
        >
          {refining ? (
            <ActivityIndicator color={accent} />
          ) : (
            <Text style={[styles.secondaryBtnText, { color: accent }]}>Try another angle</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ThoughtReframeScreen() {
  const { theme } = useTheme();
  const accent = theme.accentGradient?.[0] || '#8B5CF6';

  const [thought, setThought] = useState('');
  const [situation, setSituation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [crisisReply, setCrisisReply] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const res = await getReframeHistory();
      setHistory(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const run = useCallback(
    async (feedback = '') => {
      const text = thought.trim();
      if (!text || loading) return;
      setLoading(true);
      setError(null);
      setCrisisReply(null);
      try {
        const res = await reframeThought({
          thought: text,
          situation: situation.trim(),
          feedback,
          previous: feedback ? result : null,
        });
        if (res?.data?.crisis) {
          setResult(null);
          setCrisisReply(res.data.reply);
        } else {
          setResult(res?.data?.result || null);
          loadHistory();
        }
      } catch (e) {
        setError(String(e?.message || 'Something went wrong. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    [thought, situation, loading, result, loadHistory]
  );

  const openFromHistory = (row) => {
    setThought(row.thought || '');
    setSituation(row.situation || '');
    setResult(row.result || null);
    setCrisisReply(null);
    setShowHistory(false);
  };

  const removeFromHistory = async (id) => {
    try {
      await deleteReframe(id);
      setHistory((h) => h.filter((x) => x.id !== id));
    } catch {
      Toast.show({ type: 'error', text1: 'Could not delete that one' });
    }
  };

  const reset = () => {
    setThought('');
    setSituation('');
    setResult(null);
    setCrisisReply(null);
    setError(null);
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={[styles.title, { color: theme.text }]}>Thought Reframing</Text>
            <TouchableOpacity onPress={() => setShowHistory((v) => !v)} style={styles.historyBtn} activeOpacity={0.7}>
              <Ionicons name="time-outline" size={18} color={accent} />
              <Text style={[styles.historyText, { color: accent }]}>{showHistory ? 'Hide' : 'History'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Write the thought that is weighing on you. I will break it down, test it and offer a fairer version.
          </Text>

          {showHistory ? (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {history.length === 0 ? (
                <Text style={[styles.body, { color: theme.textSecondary }]}>Nothing saved yet.</Text>
              ) : (
                history.map((row) => (
                  <View key={row.id} style={styles.historyRow}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openFromHistory(row)} activeOpacity={0.7}>
                      <Text style={[styles.body, { color: theme.text }]} numberOfLines={2}>{row.thought}</Text>
                      <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                        {new Date(row.created_at).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeFromHistory(row.id)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ) : null}

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="What is the thought?"
              placeholderTextColor={theme.textSecondary}
              value={thought}
              onChangeText={setThought}
              multiline
              maxLength={MAX_LEN}
              editable={!loading}
            />
            <TextInput
              style={[styles.smallInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="What was happening? (optional)"
              placeholderTextColor={theme.textSecondary}
              value={situation}
              onChangeText={setSituation}
              maxLength={400}
              editable={!loading}
            />
            {!thought && !result ? (
              <View style={styles.examples}>
                {EXAMPLES.map((ex) => (
                  <TouchableOpacity key={ex} onPress={() => setThought(ex)} style={[styles.chip, { borderColor: theme.border }]} activeOpacity={0.7}>
                    <Text style={[styles.chipText, { color: theme.textSecondary }]}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
            <TouchableOpacity onPress={() => run('')} disabled={!thought.trim() || loading} activeOpacity={0.85} style={{ opacity: !thought.trim() || loading ? 0.6 : 1 }}>
              <LinearGradient colors={theme.accentGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                {loading && !result ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{result ? 'Reframe again' : 'Reframe this thought'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
            {result || thought ? (
              <TouchableOpacity onPress={reset} style={{ alignSelf: 'center', marginTop: 12 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>Start over</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {crisisReply ? (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: '#EF4444' }]}>
              <Text style={[styles.body, { color: theme.text }]}>{crisisReply}</Text>
            </View>
          ) : null}

          {result ? (
            <ResultView result={result} theme={theme} accent={accent} onRefine={run} refining={loading} />
          ) : null}

          <Text style={[styles.footnote, { color: theme.textSecondary }]}>
            A thinking tool, not therapy or a diagnosis. If things feel heavy, please talk to someone you trust.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 18, paddingBottom: 60 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyText: { fontSize: 13, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  subLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  bulletRow: { flexDirection: 'row', gap: 10, marginBottom: 6, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  distortion: { marginBottom: 10 },
  distortionName: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  validation: { fontSize: 15, lineHeight: 22, fontStyle: 'italic', marginBottom: 14 },
  input: { minHeight: 90, fontSize: 16, textAlignVertical: 'top', paddingTop: 0 },
  smallInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginTop: 8 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12 },
  primaryBtn: { marginTop: 14, borderRadius: 26, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { borderWidth: 1.5, borderRadius: 22, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  secondaryBtnText: { fontSize: 14, fontWeight: '800' },
  balanced: { borderRadius: 20, padding: 18, marginBottom: 14 },
  balancedLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  balancedText: { color: '#fff', fontSize: 17, lineHeight: 25, fontWeight: '700' },
  error: { color: '#EF4444', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  historyDate: { fontSize: 11, marginTop: 2 },
  footnote: { fontSize: 11, textAlign: 'center', marginTop: 6, lineHeight: 16 },
});
