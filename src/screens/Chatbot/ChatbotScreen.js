import React from 'react';
import { View, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import MessageBubble from '../../components/chatbot/MessageBubble';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/colors';

const ChatbotScreen = () => {
  const { theme } = useTheme();
  const themeColors = colors[theme];
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');

  const sendMessage = () => {
    setMessages([...messages, { text: input, isUser: true }]);
    setMessages(msgs => [...msgs, { text: 'AI Response', isUser: false }]); // Placeholder AI
    setInput('');
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <MessageBubble message={item.text} isUser={item.isUser} />}
      />
      <View style={styles.inputContainer}>
        <TextInput style={[styles.input, { color: themeColors.text }]} value={input} onChangeText={setInput} />
        <Button title="Send" onPress={sendMessage} color={themeColors.primary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 20,
    padding: 10,
  },
});

export default ChatbotScreen;