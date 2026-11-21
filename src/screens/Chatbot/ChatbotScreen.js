import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import { sendChatMessage, fetchChatHistory } from '../../services/api';
import MessageBubble from '../../components/chatbot/MessageBubble';
import Toast from 'react-native-toast-message';
import { setCoachReturn, openCoachLink, takeCoachEvent, subscribeCoachEvent } from '../../utils/coachNav';

const STARTER_OPTIONS = ["I'm overwhelmed", 'Help me start a task', "I'm feeling low", 'Just chatting'];

// Survives screen remounts, so an "Ask coach" start message is never sent twice
const globalCoachKey = { current: null };

export default function ChatbotScreen({ route }) {
  const themeCtx = useTheme();
  const { theme, isDark } = themeCtx;
  const themeRef = useRef(themeCtx); // latest rewards state, readable from async code
  themeRef.current = themeCtx;
  const { profile, refreshData } = useAppData();
  const navigation = useNavigation();
  const displayName = profile?.name || 'Friend';
  const mode = route?.params?.context;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const makeStarter = () => {
    const starterText =
      mode === 'reframing'
        ? `Hey ${displayName}, let's look at those thoughts together. What's on your mind?`
        : `Hey ${displayName} 🌿 I'm here with you. What feels hardest right now?`;
    return [{ id: 'starter', role: 'ai', text: starterText, options: STARTER_OPTIONS }];
  };

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetchChatHistory();
        if (res?.data?.messages?.length > 0) {
          setConversationId(res.data.conversationId);
          setMessages(
            res.data.messages.map((m) => ({
              id: m.id,
              dbId: m.id,
              role: m.sender === 'assistant' ? 'ai' : 'user',
              text: m.message,
              rating: m.rating ?? null,
              options: m.metadata?.options || null,
              links: m.metadata?.links || null,
              fromOption: !!m.metadata?.fromOption,
            }))
          );
        } else {
          setMessages(makeStarter());
        }
      } catch (err) {
        console.warn('Failed to load history', err);
        setMessages(makeStarter());
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The coach changed rewards on the server (earned coins, bought or switched something):
  // reload them, show what happened, and start music if asked to
  const handleRewardsChanged = async (changes) => {
    await themeRef.current.refreshRewards();
    const earned = changes.reduce((sum, c) => sum + (c.earned || 0), 0);
    const unlocked = changes.find((c) => c.unlocked)?.unlocked;
    const song = changes.find((c) => c.play);
    if (earned > 0) {
      Toast.show({ type: 'success', text1: `+${earned} 🪙 earned`, text2: 'Added by your coach' });
    }
    if (unlocked) {
      setTimeout(() => {
        Toast.show({ type: 'success', text1: `Unlocked: ${unlocked.name} 🎉`, text2: `-${unlocked.cost} 🪙` });
      }, earned > 0 ? 2400 : 0);
    }
    if (song) {
      // wait for the new track to be selected; do not pause a track that is already playing
      setTimeout(() => {
        const t = themeRef.current;
        if (t.selectedSoundId !== song.soundId) return;
        if (t.isSoundPlaying) return;
        t.toggleSoundPlayback();
      }, 700);
    }
  };

  // overrideText is set when the user taps an option chip
  const sendMessage = async (overrideText, fromOption = false, context = null) => {
    const userText = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!userText || sending) return;

    const userMsg = { id: Date.now().toString(), role: 'user', text: userText, fromOption };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const response = await sendChatMessage(conversationId, userText, fromOption, context);
      const { conversationId: returnedId, reply, toolCalls, messageId, options, links, appActions } = response.data;

      if (!conversationId) setConversationId(returnedId);

      let focusAction = null;
      if (Array.isArray(toolCalls)) {
        const focusCall = toolCalls.find((tc) => tc.name === 'start_focus_session');
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
        {
          id: messageId || `${Date.now()}-ai`,
          dbId: messageId,
          role: 'ai',
          text: reply,
          focusAction,
          options: Array.isArray(options) && options.length > 0 ? options : null,
          links: Array.isArray(links) && links.length > 0 ? links : null,
        },
      ]);

      // The coach earned coins / bought / switched something for the user (saved on the server)
      const rewardChanges = Array.isArray(appActions) ? appActions.filter((a) => a.type === 'rewards_changed') : [];
      if (rewardChanges.length > 0) {
        handleRewardsChanged(rewardChanges).catch(() => undefined);
      }

      const changedData =
        Array.isArray(toolCalls) && toolCalls.some((tc) => tc.name !== 'present_options');
      if (changedData && typeof refreshData === 'function') {
        refreshData().catch(() => undefined);
      }
    } catch (err) {
      console.error('Chat send failed:', err);
      setError(String(err?.message || '').includes('busy') ? err.message : 'Could not reach your AI coach. Check connection.');
    } finally {
      setSending(false);
    }
  };

  // An exercise (or other screen) left a message for the coach: send it as soon as the chat is shown
  const sendRef = useRef(null);
  sendRef.current = sendMessage;
  useEffect(() => {
    if (loadingHistory) return undefined;
    const deliver = () => {
      const ev = takeCoachEvent();
      if (ev && sendRef.current) sendRef.current(ev, true);
    };
    deliver();
    const offFocus = navigation.addListener('focus', deliver);
    // e.g. the badge celebration asks the coach to congratulate while the chat is already open
    const offEvent = subscribeCoachEvent(() => {
      if (navigation.isFocused()) deliver();
    });
    return () => {
      offFocus();
      offEvent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory]);

  // Back on the chat: the floating "Back to coach" chip is no longer needed
  useEffect(() => {
    setCoachReturn(false);
    const unsub = navigation.addListener('focus', () => setCoachReturn(false));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opened from "Ask coach" on a subtask: start the conversation about that step
  const coachContext = route?.params?.coachContext;
  const handledCoachKey = globalCoachKey;
  useEffect(() => {
    if (loadingHistory || !coachContext) return;
    const key = route?.params?._ts || coachContext.subtaskId;
    if (handledCoachKey.current === key) return;
    handledCoachKey.current = key;
    navigation.setParams({ coachContext: undefined, _ts: undefined });
    sendMessage(`Help me with this step: "${coachContext.subtaskTitle}"`, true, coachContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingHistory, coachContext]);

  const handleKeyPress = (e) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleStartFocus = (focusAction) => {
    // Focus is a bottom tab inside MainTabs, so it must be reached through it
    navigation.navigate('MainTabs', { screen: 'Focus', params: { autoStartConfig: focusAction } });
  };

  if (loadingHistory) {
    return (
      <LinearGradient colors={isDark ? ['#0F172A', '#1E1B4B'] : ['#EEF2FF', '#F8FAFC']} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={isDark ? ['#0F172A', '#1E1B4B'] : ['#EEF2FF', '#F8FAFC']} style={styles.container}>
      <FlatList
        ref={listRef}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        data={messages}
        extraData={sending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item, index }) => (
          <MessageBubble
            item={item}
            onStartFocus={handleStartFocus}
            showOptions={index === messages.length - 1 && !sending}
            onPickOption={(opt) => sendMessage(opt, true)}
            onOpenLink={(link) => openCoachLink(navigation, link.key)}
          />
        )}
        ListFooterComponent={
          sending ? (
            <View style={[styles.bubble, styles.aiBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          ) : null
        }
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={[styles.inputRow, { backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : '#FFFFFF' }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Message your AI coach..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          onKeyPress={handleKeyPress}
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
          multiline
          editable={!sending}
        />
        <TouchableOpacity onPress={() => sendMessage()} style={styles.sendBtn} disabled={sending}>
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
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' },
  errorText: { color: '#EF4444', fontSize: 12, textAlign: 'center', marginBottom: 4 },
  inputRow: { position: 'absolute', bottom: 12, left: 12, right: 12, borderRadius: 16, padding: 8, flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' },
  input: { flex: 1, maxHeight: 90, fontSize: 14, paddingHorizontal: 10, paddingVertical: 10 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C3AED' },
});