import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import { sendChatMessage } from '../../services/api';

export default function ChatbotScreen({ route }) {
  const { theme, isDark } = useTheme();
  const { profile } = useAppData();
  const displayName = profile?.name || 'Friend';
  const mode = route?.params?.context;

  const starter = mode === 'reframing'
    ? [{ id: '1', role: 'ai', text: `Hey ${displayName}, let's look at those thoughts together. What's on your mind?` }]
    : [{ id: '1', role: 'ai', text: `Hey ${displayName} 🌿 I am here with calm ADHD-friendly support. What feels hardest right now?` }];

  const [messages, setMessages] = useState(starter);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async () => {
    const userText = input.trim();
    if (!userText || sending) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(conversationId, userText);
      const { conversationId: returnedId, reply } = response.data;

      if (!conversationId) setConversationId(returnedId);

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-ai`, role: 'ai', text: reply },
      ]);
    } catch (err) {
      console.error('Chat send failed:', err);
      setError('Could not reach your AI coach. Check your connection and try again.');
      // Roll the optimistic user message back out isn't necessary — keep it
      // visible, just surface the error so the user can retry.
    } finally {
      setSending(false);
    }
  };

  return (
    <LinearGradient colors={isDark ? ['#0F172A', '#1E1B4B'] : ['#EEF2FF', '#F8FAFC']} style={styles.container}>
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
                : [styles.aiBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }],
            ]}
          >
            <Text style={{ color: item.role === 'user' ? '#FFFFFF' : theme.text, fontSize: 14 }}>{item.text}</Text>
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View style={[styles.bubble, styles.aiBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          ) : null
        }
      />

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <View style={[styles.inputRow, { backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : '#FFFFFF' }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Message your AI coach..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={sending}>
          <Send color="#FFFFFF" size={18} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { padding: 16, paddingBottom: 100 },
  bubble: { maxWidth: '84%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' },
  errorText: { color: '#EF4444', fontSize: 12, textAlign: 'center', marginBottom: 4 },
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
  input: { flex: 1, maxHeight: 90, fontSize: 14, paddingHorizontal: 10, paddingVertical: 10 },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
});
