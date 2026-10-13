import React, { useCallback, useState } from 'react';
import {
  View, Text, Switch, TouchableOpacity, StyleSheet, Alert,
  Modal, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Moon, Sun, Bell, Trash2, LogOut, ChevronRight, ChevronLeft,
  User as UserIcon, Palette, ClipboardList, Brain, Info, Shield,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';

function SectionCard({ title, theme, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({ icon: Icon, label, sub, right, onPress, danger, theme, isLast }) {
  const RowWrap = onPress ? TouchableOpacity : View;
  return (
    <RowWrap
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      {Icon ? (
        <View style={[styles.rowIconWrap, { backgroundColor: theme.border }]}>
          <Icon size={17} color={danger ? '#EF4444' : theme.text} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? '#EF4444' : theme.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{sub}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? (
        <ChevronRight size={18} color={theme.textSecondary} />
      ) : null}
    </RowWrap>
  );
}

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, themes, selectedThemeId } = useTheme();
  const { tasks, habits, deleteTask, deleteHabit } = useAppData();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [assessmentOnStart, setAssessmentOnStartState] = useState(true);
  const [silentHoursEnabled, setSilentHoursEnabled] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const currentThemeName = themes.find((t) => t.id === selectedThemeId)?.name ?? 'Default';

  const handleResetData = useCallback(async () => {
    try {
      for (const task of tasks) await deleteTask(task.id);
      for (const habit of habits) await deleteHabit(habit.id);
      Alert.alert('✅ Success', 'All data has been reset.');
      setResetModalVisible(false);
    } catch (e) {
      Alert.alert('❌ Error', 'Failed to reset data.');
      console.error(e);
    }
  }, [resetAppData, resetThemeData]);

  const handleLogout = useCallback(() => {
    setLogoutModalVisible(false);
    navigation.replace('Login');
  }, [navigation]);

  return (
    <LinearGradient colors={theme.background} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <ChevronLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Settings</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Account */}
        <SectionCard title="ACCOUNT" theme={theme}>
          <Row
            icon={UserIcon}
            label="Profile"
            sub="Name, mood, assessments"
            theme={theme}
            onPress={() => navigation.navigate('Profile')}
          />
          <Row
            icon={Palette}
            label="Appearance"
            sub={currentThemeName}
            theme={theme}
            onPress={() => navigation.navigate('Rewards')}
            isLast
          />
        </SectionCard>

        {/* Notifications */}
        <SectionCard title="NOTIFICATIONS" theme={theme}>
          <Row
            icon={Bell}
            label="Enable notifications"
            theme={theme}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor={notificationsEnabled ? theme.accentGradient[0] : '#cbd5e1'}
                trackColor={{ true: theme.accentGradient[0] + '55', false: theme.border }}
              />
            }
            isLast={!notificationsEnabled}
          />
          {notificationsEnabled && (
            <Row
              icon={Moon}
              label="Silent hours"
              sub="22:00 – 08:00"
              theme={theme}
              right={
                <Switch
                  value={silentHoursEnabled}
                  onValueChange={setSilentHoursEnabled}
                  thumbColor={silentHoursEnabled ? theme.accentGradient[0] : '#cbd5e1'}
                  trackColor={{ true: theme.accentGradient[0] + '55', false: theme.border }}
                />
              }
              isLast
            />
          )}
        </SectionCard>

        {/* Assessments */}
        <SectionCard title="ASSESSMENTS" theme={theme}>
          <Row
            icon={ClipboardList}
            label="ADHD screening"
            sub="Retake or view results"
            theme={theme}
            onPress={() => navigation.navigate('Questionnaire')}
          />
          <Row
            icon={Brain}
            label="Executive function"
            sub="Retake or view dimensions"
            theme={theme}
            onPress={() => navigation.navigate('EFQuestionnaire')}
            isLast
          />
        </SectionCard>

        {/* Data */}
        <SectionCard title="DATA & PRIVACY" theme={theme}>
          <Row
            icon={Shield}
            label="Privacy policy"
            theme={theme}
            onPress={() => Alert.alert('Privacy', 'We store your data securely with Supabase.')}
          />
          <Row
            icon={Trash2}
            label="Reset all data"
            sub="Delete all tasks and habits"
            danger
            theme={theme}
            onPress={() => setResetModalVisible(true)}
            isLast
          />
        </SectionCard>

        {/* About */}
        <SectionCard title="ABOUT" theme={theme}>
          <Row icon={Info} label="Version" theme={theme} right={<Text style={{ color: theme.textSecondary }}>1.0.0</Text>} isLast />
        </SectionCard>

        {/* Logout */}
        <TouchableOpacity
          onPress={() => setLogoutModalVisible(true)}
          style={[styles.logoutBtn, { borderColor: '#EF4444' }]}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reset modal */}
      <Modal visible={resetModalVisible} transparent animationType="fade" onRequestClose={() => setResetModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reset all data?</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              This permanently deletes every task and habit. This cannot be undone.
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity
                onPress={() => setResetModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResetData}
                style={[styles.modalBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Delete all</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Log out?</Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              You'll need to sign back in to access your data.
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                style={[styles.modalBtn, { borderColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={[styles.modalBtn, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Log out</Text>
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
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 30 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 24, fontWeight: '800' },

  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  rowIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1, marginTop: 6,
  },
  logoutBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 22, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  modalMessage: { fontSize: 14, lineHeight: 20, marginBottom: 22 },
  modalRow: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});