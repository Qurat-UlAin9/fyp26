import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, User } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ADHDButton from '../../components/common/ADHDButton';

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRegister = () => {
    // Dummy register
    navigation.replace('Onboarding');
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>

          <View style={styles.inputContainer}>
            <User color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Full Name" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={name} onChangeText={setName} />
          </View>
          <View style={styles.inputContainer}>
            <Mail color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Email" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputContainer}>
            <Lock color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Password" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          <View style={styles.inputContainer}>
            <Lock color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Confirm Password" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={confirm} onChangeText={setConfirm} secureTextEntry />
          </View>

          <ADHDButton title="Register" onPress={handleRegister} style={styles.button} />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderRadius: 20, padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, height: 50 },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  button: { marginTop: 8 },
});