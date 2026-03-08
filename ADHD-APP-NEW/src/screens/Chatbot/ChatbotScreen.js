import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const starter = [
  { id: '1', role: 'ai', text: 'Hey Ain 🌿 I am here with calm ADHD-friendly support. What feels hardest right now?' },
];

export default function ChatbotScreen() {
  const { theme, isDark } = useTheme();
  const [messages, setMessages] = useState(starter);
  const [input, setInput] = useState('');

  const aiReplies = useMemo(
    () => [
      'Let’s break that into a 5-minute first step. Tiny progress counts.',
      'You are not behind—you are regulating. Take one breath, then one action.',
      'Try: set a 10-min timer, remove one distraction, and start with the easiest subtask.',
      'Great self-awareness. Do you want a quick focus plan or calming reset?',
    ],
    []
  );

  const sendMessage = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const next = [...messages, { id: Date.now().toString(), role: 'user', text: userText }];
    const reply = aiReplies[next.length % aiReplies.length];
    setMessages([...next, { id: `${Date.now()}-ai`, role: 'ai', text: reply }]);
    setInput('');
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
      />

      <View style={[styles.inputRow, { backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : '#FFFFFF' }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Message your AI coach..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
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
