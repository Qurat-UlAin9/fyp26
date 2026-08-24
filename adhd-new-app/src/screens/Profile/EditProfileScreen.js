import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Camera } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import ADHDButton from '../../components/common/ADHDButton';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { profile, updateProfile } = useAppData();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.card }]}>
            <User color={theme.text} size={50} />
          </View>
          <View style={styles.cameraIcon}>
            <Camera color={theme.text} size={20} />
          </View>
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <User color={theme.textSecondary} size={20} style={styles.icon} />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputContainer}>
          <Mail color={theme.textSecondary} size={20} style={styles.icon} />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <ADHDButton title="Save Changes" onPress={() => { updateProfile({ name, email }); navigation.goBack(); }} style={styles.button} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20, alignItems: 'center', paddingTop: 60 },
  avatarContainer: { position: 'relative', marginBottom: 40 },
  avatar: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', borderRadius: 20, padding: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, marginBottom: 16, height: 50 },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  button: { width: '100%', marginTop: 16 },
});