import React, { useState } from 'react';
import {
  Alert,
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
import { useAppData } from '../../contexts/AppDataContext';
import ADHDButton from '../../components/common/ADHDButton';
import { registerUser } from '../../services/api';

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { updateProfile } = useAppData();
  const [loading, setLoading] = useState(false);

  const isStrongPassword = (value) => value.length >= 6 && /\d/.test(value);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Let’s complete your profile', 'Please enter username, email, and password to continue.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Email looks invalid', 'Please enter a valid email format like name@example.com.');
      return;
    }
    if (!isStrongPassword(password.trim())) {
      Alert.alert('Password requirements', 'Use at least 6 characters and include at least 1 digit.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Please make sure both password fields are exactly the same.');
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        full_name: name.trim(),
        username: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      updateProfile({ name: name.trim() || 'Friend', email: email.trim() });
      navigation.replace('Onboarding');
    } catch (error) {
      Alert.alert(
        'Registration failed',
        `${error.message}\n\nGuidance:\n• Username must be unique\n• Email must be unique\n• Password must be 6+ chars with at least 1 digit`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>

          <View style={styles.inputContainer}>
            <User color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Username" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={name} onChangeText={setName} autoCapitalize="none" />
          </View>
          <View style={styles.inputContainer}>
            <Mail color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Email" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.inputContainer}>
            <Lock color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Password (min 6 + 1 digit)" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          <View style={styles.inputContainer}>
            <Lock color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput placeholder="Confirm Password" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} value={confirm} onChangeText={setConfirm} secureTextEntry />
          </View>

          <ADHDButton title={loading ? 'Registering...' : 'Register'} onPress={handleRegister} style={styles.button} disabled={loading} />
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
