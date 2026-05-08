import React, { useState } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import ADHDButton from '../../components/common/ADHDButton';
import { getCurrentUser, loginUser } from '../../services/api';
import { useAppData } from '../../contexts/AppDataContext';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useAppData();

  const handleLogin = async () => {
    const loginValue = identifier.trim();
    if (!loginValue || !password.trim()) {
      Alert.alert('Missing login details', 'Enter your username or email and password to continue.');
      return;
    }
    if (password.trim().length < 6 || !/\d/.test(password.trim())) {
      Alert.alert('Password check', 'Password should be at least 6 characters and include at least 1 digit.');
      return;
    }
    try {
      setLoading(true);
      await loginUser({ username: loginValue, email: loginValue, password: password.trim() });
      const saved = await getCurrentUser();
      if (saved) updateProfile({ name: saved.username || saved.full_name || loginValue, email: saved.email || '' });
      navigation.replace('Onboarding');
    } catch (error) {
      Alert.alert(
        'Login failed',
        'We could not sign you in.\n\nGuidance:\n• Check username/email spelling\n• Check password (min 6 chars + 1 digit)\n• If this is your first time, register first'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>

          <View style={styles.inputContainer}>
            <User color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput
              placeholder="Username or Email"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock color={theme.textSecondary} size={20} style={styles.icon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <ADHDButton title={loading ? 'Logging in...' : 'Login'} onPress={handleLogin} style={styles.button} disabled={loading} />

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.link, { color: theme.textSecondary }]}>
              Don't have an account? Register
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, height: 50 },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  button: { marginTop: 8, marginBottom: 16 },
  link: { textAlign: 'center', fontSize: 14 },
});
