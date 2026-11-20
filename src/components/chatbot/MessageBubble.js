import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThumbsUp, ThumbsDown, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { submitFeedback } from '../../services/api';

// Tiny markdown renderer: headings, bullets, numbered lists, **bold**. Hides --- rules.
function MarkdownText({ text, style }) {
  if (!text) return null;
  const lines = String(text).split('\n');
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trim();
        if (!line) return <View key={i} style={{ height: 6 }} />;
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) return null;

        const heading = line.match(/^#{1,6}\s+(.*)$/);
        const bullet = !heading && line.match(/^[*-]\s+(.*)$/);
        const numbered = !heading && !bullet && line.match(/^(\d+)[.)]\s+(.*)$/);
        const content = heading ? heading[1] : bullet ? bullet[1] : numbered ? numbered[2] : line;
        const marker = bullet ? '•' : numbered ? `${numbered[1]}.` : null;
        const parts = content.split(/(\*\*.*?\*\*)/g).filter(Boolean);

        return (
          <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
            {marker ? <Text style={[style, { width: 20 }]}>{marker}</Text> : null}
            <Text
              style={[
                style,
                { flex: 1, lineHeight: 22 },
                heading && { fontWeight: '700', fontSize: (style?.fontSize || 14) + 1 },
              ]}
            >
              {parts.map((p, j) =>
                p.startsWith('**') && p.endsWith('**') ? (
                  <Text key={j} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text>
                ) : (
                  <Text key={j}>{p}</Text>
                )
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MessageBubble({
  item,
  onStartFocus,
  showOptions = false,
  onPickOption,
  onOpenLink,
}) {
  const { theme, isDark } = useTheme();
  const [feedback, setFeedback] = useState(item.rating ?? null);
  const isUser = item.role === 'user';
  const isChoice = isUser && item.fromOption;

  const handleFeedback = async (rating) => {
    if (feedback) return;
    setFeedback(rating);
    try {
      await submitFeedback(item.dbId, rating);
    } catch (err) {
      console.warn('Failed to submit feedback', err);
      setFeedback(null);
    }
  };

  return (
    <View
      style={[
        styles.bubble,
        isUser
          ? [styles.userBubble, { backgroundColor: isChoice ? '#0D9488' : '#7C3AED' }]
          : [styles.aiBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }],
      ]}
    >
      {isUser ? (
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: isChoice ? '700' : '400' }}>
          {item.text}
        </Text>
      ) : (
        <>
          <MarkdownText text={item.text} style={{ color: theme.text, fontSize: 14 }} />

          {item.focusAction && (
            <TouchableOpacity onPress={() => onStartFocus(item.focusAction)} activeOpacity={0.85} style={styles.focusChip}>
              <LinearGradient colors={['#A78BFA', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.focusChipGrad}>
                <Play size={13} color="#FFF" fill="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.focusChipText} numberOfLines={1}>
                  Start {item.focusAction.minutes}-min session
                  {item.focusAction.taskTitle ? ` · ${item.focusAction.taskTitle}` : ''}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Links open an app screen. They stay on old messages so they remain useful. */}
          {Array.isArray(item.links) && item.links.length > 0 && (
            <View style={styles.linksWrap}>
              {item.links.map((link, i) => (
                <TouchableOpacity
                  key={`${link.key}-${i}`}
                  style={styles.linkBtn}
                  onPress={() => onOpenLink && onOpenLink(link)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.linkText} numberOfLines={1}>{link.label}  →</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Options only show on the latest message; they vanish once one is picked. */}
          {showOptions && Array.isArray(item.options) && item.options.length > 0 && (
            <View style={styles.optionsWrap}>
              {item.options.map((opt, i) => (
                <TouchableOpacity
                  key={`${opt}-${i}`}
                  style={[styles.optionChip, { backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#F3E8FF' }]}
                  onPress={() => onPickOption && onPickOption(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.feedbackRow, !item.dbId && { display: 'none' }]}>
            <TouchableOpacity onPress={() => handleFeedback(1)} style={styles.feedbackBtn} disabled={!!feedback}>
              <ThumbsUp size={16} color={feedback === 1 ? '#10B981' : theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFeedback(-1)} style={styles.feedbackBtn} disabled={!!feedback}>
              <ThumbsDown size={16} color={feedback === -1 ? '#EF4444' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '84%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' },
  focusChip: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  focusChipGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  focusChipText: { color: '#FFF', fontWeight: '700', fontSize: 13, flexShrink: 1 },
  linksWrap: { marginTop: 12, gap: 8 },
  linkBtn: { backgroundColor: '#0D9488', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  linkText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  optionsWrap: { marginTop: 12, gap: 8 },
  optionChip: { borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  optionText: { color: '#7C3AED', fontWeight: '700', fontSize: 14 },
  feedbackRow: { flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.2)', justifyContent: 'flex-end', gap: 12 },
  feedbackBtn: { padding: 4 },
});