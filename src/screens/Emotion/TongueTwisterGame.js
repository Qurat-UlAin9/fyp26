import React, { useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, Eye, EyeOff, RotateCcw, Sparkles } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { coinsForGameScore } from '../../utils/gameRewards';

const PROMPTS = {
  gentle: [
    {
      text: 'Bright blue birds bring berries.',
      chunks: ['Bright blue', 'birds bring', 'berries'],
    },
    {
      text: 'Tiny turtles tiptoe to tea.',
      chunks: ['Tiny turtles', 'tiptoe', 'to tea'],
    },
    {
      text: 'Mina makes many mint muffins.',
      chunks: ['Mina makes', 'many mint', 'muffins'],
    },
  ],
  stretch: [
    {
      text: 'Clever clapping crabs clean clear clam shells.',
      chunks: ['Clever clapping', 'crabs clean', 'clear clam shells'],
    },
    {
      text: 'Seven sleepy sheep share shiny shoes.',
      chunks: ['Seven sleepy', 'sheep share', 'shiny shoes'],
    },
    {
      text: 'Rory the red rabbit rapidly rolls round rocks.',
      chunks: ['Rory the red rabbit', 'rapidly rolls', 'round rocks'],
    },
  ],
};

export default function TongueTwisterGame({ navigation }) {
  const { theme, earnCoins } = useTheme();
  const [level, setLevel] = useState('gentle');
  const [promptIndex, setPromptIndex] = useState(0);
  const [showChunks, setShowChunks] = useState(true);
  const [repeatCount, setRepeatCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const completedRef = useRef(false);

  const prompts = PROMPTS[level];
  const prompt = prompts[promptIndex];

  const resetSession = () => {
    setPromptIndex(0);
    setRepeatCount(0);
    setIsComplete(false);
    completedRef.current = false;
  };

  const selectLevel = (nextLevel) => {
    if (nextLevel === level) return;
    setLevel(nextLevel);
    resetSession();
  };

  const finishSession = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsComplete(true);
    const reward = coinsForGameScore(prompts.length * 10);
    if (reward > 0) earnCoins(reward);
    Toast.show({
      type: 'success',
      text1: 'Lovely work!',
      text2: `${prompts.length} prompts tried · ${reward} coins earned`,
      visibilityTime: 3000,
    });
  };

  const handleNext = () => {
    if (promptIndex === prompts.length - 1) {
      finishSession();
      return;
    }
    setPromptIndex((current) => current + 1);
    setRepeatCount(0);
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[styles.backButton, { borderColor: theme.border }]}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft color={theme.text} size={20} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Tongue Twisters</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start this practice again"
              style={[styles.backButton, { borderColor: theme.border }]}
              onPress={resetSession}
            >
              <RotateCcw color={theme.text} size={18} />
            </Pressable>
          </View>

          <View style={[styles.introCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Sparkles color={theme.accentGradient[0]} size={20} />
            <View style={styles.introCopy}>
              <Text style={[styles.introTitle, { color: theme.text }]}>Your pace, your practice</Text>
              <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                Read out loud, whisper, or just follow along. There is no timer and no wrong answer.
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>CHOOSE A COMFORT LEVEL</Text>
          <View style={styles.levelRow}>
            {[
              { id: 'gentle', label: 'Gentle start' },
              { id: 'stretch', label: 'A little twistier' },
            ].map((option) => {
              const selected = level === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectLevel(option.id)}
                  style={[
                    styles.levelButton,
                    {
                      backgroundColor: selected ? theme.accentGradient[0] : theme.card,
                      borderColor: selected ? theme.accentGradient[0] : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.levelText, { color: selected ? '#0F172A' : theme.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.practiceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.promptCount, { color: theme.textSecondary }]}>
                {isComplete ? 'Practice complete' : `Prompt ${promptIndex + 1} of ${prompts.length}`}
              </Text>
              {!isComplete && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showChunks ? 'Hide word groups' : 'Show word groups'}
                  accessibilityState={{ selected: showChunks }}
                  onPress={() => setShowChunks((current) => !current)}
                  style={styles.hintToggle}
                >
                  {showChunks
                    ? <EyeOff color={theme.accentGradient[0]} size={17} />
                    : <Eye color={theme.accentGradient[0]} size={17} />}
                  <Text style={[styles.hintText, { color: theme.accentGradient[0] }]}>
                    {showChunks ? 'Hide cues' : 'Show cues'}
                  </Text>
                </Pressable>
              )}
            </View>

            {isComplete ? (
              <View style={styles.completeContent} accessibilityLiveRegion="polite">
                <Text style={styles.completeEmoji}>🌟</Text>
                <Text style={[styles.promptText, { color: theme.text }]}>You showed up and tried. That counts!</Text>
                <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                  Take a break or start another gentle round whenever you like.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.promptText, { color: theme.text }]} accessibilityLiveRegion="polite">
                  {prompt.text}
                </Text>
                {showChunks && (
                  <Text style={[styles.chunkText, { color: theme.accentGradient[0] }]}>
                    {prompt.chunks.join('   /   ')}
                  </Text>
                )}
                <Text style={[styles.promptNote, { color: theme.textSecondary }]}>
                  Go slowly. Repeat a word or pause whenever you want.
                </Text>
                {repeatCount > 0 && (
                  <Text style={[styles.repeatNote, { color: theme.textSecondary }]}>
                    Nice — you have practised this one {repeatCount} {repeatCount === 1 ? 'time' : 'times'}.
                  </Text>
                )}
              </>
            )}
          </View>

          {!isComplete ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                style={[styles.secondaryButton, { borderColor: theme.border }]}
                onPress={() => setRepeatCount((count) => count + 1)}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Say it again</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.primaryButton, { backgroundColor: theme.accentGradient[0] }]}
                onPress={handleNext}
              >
                <Text style={styles.primaryButtonText}>
                  {promptIndex === prompts.length - 1 ? 'Finish practice' : 'I tried it'}
                </Text>
                <ArrowRight color="#0F172A" size={18} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={[styles.primaryButton, styles.restartButton, { backgroundColor: theme.accentGradient[0] }]}
              onPress={resetSession}
            >
              <Text style={styles.primaryButtonText}>Try another round</Text>
              <RotateCcw color="#0F172A" size={18} />
            </Pressable>
          )}

          <Text style={[styles.footerNote, { color: theme.textSecondary }]}>
            A playful focus-and-speech warm-up, not a test or treatment.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  introCopy: { flex: 1, gap: 5 },
  introTitle: { fontSize: 16, fontWeight: '700' },
  bodyText: { fontSize: 14, lineHeight: 21 },
  sectionLabel: { marginTop: 24, marginBottom: 10, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  levelRow: { flexDirection: 'row', gap: 10 },
  levelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  levelText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  practiceCard: {
    marginTop: 18,
    padding: 20,
    minHeight: 250,
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promptCount: { fontSize: 13, fontWeight: '700' },
  hintToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  hintText: { fontSize: 12, fontWeight: '700' },
  promptText: { marginTop: 28, fontSize: 27, lineHeight: 38, fontWeight: '700', textAlign: 'center' },
  chunkText: { marginTop: 18, fontSize: 15, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  promptNote: { marginTop: 18, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  repeatNote: { marginTop: 10, fontSize: 12, textAlign: 'center' },
  completeContent: { alignItems: 'center', paddingBottom: 10 },
  completeEmoji: { marginTop: 24, fontSize: 38 },
  actions: { gap: 10, marginTop: 16 },
  primaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  primaryButtonText: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700' },
  restartButton: { marginTop: 16 },
  footerNote: { marginTop: 18, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});