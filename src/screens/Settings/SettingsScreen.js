import React, { useState, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, Sun, Globe, Bell, Trash2, LogOut } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import GlassCard from '../../components/common/GlassCard';

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { tasks, habits, deleteTask, deleteHabit } = useAppData();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [silentHoursEnabled, setSilentHoursEnabled] = useState(false);
  const [silentHoursStart, setSilentHoursStart] = useState('22:00');
  const [silentHoursEnd, setSilentHoursEnd] = useState('08:00');
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Handle Notification Toggle
  const handleNotificationToggle = useCallback((value) => {
    setNotificationsEnabled(value);
    // TODO: Sync with backend preferences
    console.log('Notifications:', value ? 'Enabled' : 'Disabled');
  }, []);

  // Handle Silent Hours Toggle
  const handleSilentHoursToggle = useCallback((value) => {
    setSilentHoursEnabled(value);
    // TODO: Sync with backend preferences
  }, []);

  // Handle Reset Data
  const handleResetData = useCallback(async () => {
    try {
      // Delete all tasks
      for (const task of tasks) {
        await deleteTask(task.id);
      }
      
      // Delete all habits
      for (const habit of habits) {
        await deleteHabit(habit.id);
      }
      
      Alert.alert('✅ Success', 'All data has been reset successfully.');
      setResetModalVisible(false);
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to reset data. Please try again.');
      console.error('Reset error:', error);
    }
  }, [tasks, habits, deleteTask, deleteHabit]);

  // Handle Logout
  const handleLogout = useCallback(() => {
    try {
      // TODO: Clear auth token from Supabase
      // TODO: Clear local storage
      setLogoutModalVisible(false);
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('❌ Error', 'Failed to logout. Please try again.');
      console.error('Logout error:', error);
    }
  }, [navigation]);

  const SettingRow = ({ icon: Icon, label, value, onValueChange, type = 'switch', showValue }) => (
    <View style={styles.settingRow}>
      <Icon color={theme.text} size={22} />
      <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      {type === 'switch' ? (
        <Switch 
          value={value} 
          onValueChange={onValueChange}
          thumbColor={value ? theme.accentGradient[0] : '#cbd5e1'}
          trackColor={{ true: theme.accentGradient[0] + '40', false: '#e2e8f0' }}
        />
      ) : (
        <TouchableOpacity onPress={onValueChange} style={styles.selectButton}>
          <Text style={[styles.selectButtonText, { color: theme.accentGradient[0] }]}>
            {showValue || 'Click'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.header, { color: theme.text }]}>⚙️ Settings</Text>
        
        {/* Theme Section */}
        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Display</Text>
          <SettingRow 
            icon={isDark ? Moon : Sun} 
            label="Dark Mode" 
            value={isDark} 
            onValueChange={toggleTheme} 
          />
        </GlassCard>

        {/* Notifications Section */}
        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
          <SettingRow 
            icon={Bell} 
            label="Enable Notifications" 
            value={notificationsEnabled} 
            onValueChange={handleNotificationToggle} 
          />
          
          {notificationsEnabled && (
            <View style={styles.nestedSetting}>
              <SettingRow 
                icon={Bell} 
                label="Silent Hours" 
                value={silentHoursEnabled} 
                onValueChange={handleSilentHoursToggle} 
              />
              
              {silentHoursEnabled && (
                <View style={styles.silentHoursDetail}>
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                    🌙 {silentHoursStart} - {silentHoursEnd}
                  </Text>
                </View>
              )}
            </View>
          )}
        </GlassCard>

        {/* Data & Privacy Section */}
        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Data & Privacy</Text>
          <TouchableOpacity 
            onPress={() => setResetModalVisible(true)}
            style={[styles.dangerRow, { borderBottomColor: theme.border }]}
          >
            <Trash2 color="#EF4444" size={22} />
            <Text style={[styles.dangerLabel, { color: theme.text }]}>Reset All Data</Text>
            <Text style={styles.dangerArrow}>›</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Account Section */}
        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
          <TouchableOpacity 
            onPress={() => setLogoutModalVisible(true)}
            style={styles.dangerRow}
          >
            <LogOut color="#F59E0B" size={22} />
            <Text style={[styles.dangerLabel, { color: theme.text }]}>Logout</Text>
            <Text style={styles.dangerArrow}>›</Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Reset Data Modal */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background[0] }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🗑️ Reset All Data?</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              This will permanently delete all your tasks and habits. This action cannot be undone.
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                onPress={() => setResetModalVisible(false)}
                style={[styles.modalButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleResetData}
                style={[styles.modalButton, styles.modalButtonDanger]}
              >
                <Text style={styles.modalButtonDangerText}>Delete All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background[0] }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🚪 Logout?</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to sign out from this device?
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                onPress={() => setLogoutModalVisible(false)}
                style={[styles.modalButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleLogout}
                style={[styles.modalButton, styles.modalButtonWarning]}
              >
                <Text style={styles.modalButtonWarningText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { padding: 0, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16,
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)' 
  },
  settingLabel: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '500' },
  selectButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  selectButtonText: { fontSize: 14, fontWeight: '600' },
  nestedSetting: { paddingLeft: 50, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  silentHoursDetail: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8, marginHorizontal: 16, marginVertical: 8 },
  detailText: { fontSize: 14, fontWeight: '500' },
  dangerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16,
    borderBottomWidth: 1
  },
  dangerLabel: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '500' },
  dangerArrow: { fontSize: 20, color: '#94A3B8' },
  spacer: { height: 40 },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  modalContent: { 
    borderRadius: 20, 
    padding: 24, 
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalMessage: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
  modalButtonRow: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  modalButtonText: { fontSize: 15, fontWeight: '600' },
  modalButtonDanger: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  modalButtonDangerText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  modalButtonWarning: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  modalButtonWarningText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
