import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, Sun, Globe, Bell, Trash2, LogOut } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import GlassCard from '../../components/common/GlassCard';

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const SettingRow = ({ icon: Icon, label, value, onValueChange, type = 'switch' }) => (
    <View style={styles.settingRow}>
      <Icon color={theme.text} size={22} />
      <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      {type === 'switch' ? (
        <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.accentGradient[0] }} />
      ) : (
        <TouchableOpacity onPress={onValueChange}>
          <Text style={{ color: theme.textSecondary }}>{value}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.header, { color: theme.text }]}>Settings</Text>
        <GlassCard style={styles.card}>
          <SettingRow icon={isDark ? Moon : Sun} label="Dark Mode" value={isDark} onValueChange={toggleTheme} />
          <SettingRow icon={Globe} label="Language" value="English" type="select" onValueChange={() => {}} />
          <SettingRow icon={Bell} label="Notifications" value={true} onValueChange={() => {}} />
          <SettingRow icon={Trash2} label="Reset Data" type="select" onValueChange={() => {}} />
          <SettingRow icon={LogOut} label="Logout" type="select" onValueChange={() => navigation.replace('Login')} />
        </GlassCard>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { padding: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  settingLabel: { flex: 1, marginLeft: 12, fontSize: 16 },
});