import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Play } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import { sendChatMessage } from '../../services/api';

// Lightweight Markdown parser for bold, italics, and bullets
function MarkdownText({ text, style }) {
  if (!text) return null;
  
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 8 }} />;

        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
        let cleanLine = isBullet ? line.trim().substring(2) : line;

        // Parse bold (**text**)
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const renderedParts = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={j} style={{ fontWeight: 'bold' }}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={j}>{part}</Text>;
        });

        return (
          <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
            {isBullet && <Text style={style}>• </Text>}
            <Text style={[style, { flex: 1, lineHeight: 22 }]}>
              {renderedParts}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ChatbotScreen({ route }) {
  const { theme, isDark } = useTheme();
  const { profile, refreshData } = useAppData();
  const navigation = useNavigation();
  const displayName = profile?.name || 'Friend';
  const mode = route?.params?.context;

  const starter =
    mode === 'reframing'
      ? [
          {
            id: '1',
            role: 'ai',
            text: `Hey ${displayName}, let's look at those thoughts together. What's on your mind?`,
          },
        ]
      : [
          {
            id: '1',
            role: 'ai',
            text: `Hey ${displayName} 🌿 I am here with calm ADHD-friendly support. What feels hardest right now?`,
          },
        ];

  const [messages, setMessages] = useState(starter);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async () => {
    const userText = input.trim();
    if (!userText || sending) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(conversationId, userText);
      const { conversationId: returnedId, reply, toolCalls } = response.data;

      if (!conversationId) setConversationId(returnedId);

      let focusAction = null;
      if (Array.isArray(toolCalls)) {
        const focusCall = toolCalls.find(
          (tc) => tc.name === 'start_focus_session'
        );
        if (focusCall && focusCall.args) {
          focusAction = {
            minutes: focusCall.args.planned_minutes || 25,
            taskTitle: focusCall.args.task_title || null,
            sessionType: focusCall.args.session_type || 'Focus',
          };
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-ai`, role: 'ai', text: reply, focusAction },
      ]);

      if (
        Array.isArray(toolCalls) &&
        toolCalls.length > 0 &&
        typeof refreshData === 'function'
      ) {
        refreshData().catch(() => undefined);
      }
    } catch (err) {
      console.error('Chat send failed:', err);
      setError(
        'Could not reach your AI coach. Check your connection and try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleStartFocus = (focusAction) => {
    navigation.navigate('Focus', {
      autoStartConfig: focusAction,
    });
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0F172A', '#1E1B4B'] : ['#EEF2FF', '#F8FAFC']}
      style={styles.container}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user'
                ? [styles.userBubble, { backgroundColor: '#7C3AED' }]
                : [
                    styles.aiBubble,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.08)'
                        : '#FFFFFF',
                    },
                  ],
            ]}
          >
            {item.role === 'user' ? (
              <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
                {item.text}
              </Text>
            ) : (
              <MarkdownText
                text={item.text}
                style={{ color: theme.text, fontSize: 14 }}
              />
            )}

            {item.focusAction && (
              <TouchableOpacity
                onPress={() => handleStartFocus(item.focusAction)}
                activeOpacity={0.85}
                style={styles.focusChip}
              >
                <LinearGradient
                  colors={['#A78BFA', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.focusChipGrad}
                >
                  <Play
                    size={13}
                    color="#FFF"
                    fill="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.focusChipText} numberOfLines={1}>
                    Start {item.focusAction.minutes}-min session
                    {item.focusAction.taskTitle
                      ? ` · ${item.focusAction.taskTitle}`
                      : ''}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View
              style={[
                styles.bubble,
                styles.aiBubble,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.08)'
                    : '#FFFFFF',
                },
              ]}
            >
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          ) : null
        }
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : '#FFFFFF',
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Message your AI coach..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={styles.sendBtn}
          disabled={sending}
        >
          <Send color="#FFFFFF" size={18} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { padding: 16, paddingBottom: 100 },
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  focusChip: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  focusChipGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  focusChipText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  inputRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: 16,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  input: {
    flex: 1,
    maxHeight: 90,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
});