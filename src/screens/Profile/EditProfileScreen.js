import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, User, Mail, Sparkles, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppData } from '../../contexts/AppDataContext';
import ADHDButton from '../../components/common/ADHDButton';
import AnimatedOrbsBackground from '../../components/common/AnimatedOrbsBackground';

const SCREEN_W = Dimensions.get('window').width;
const CARD_PADDING = 22;
const GRID_GAP = 10;
const AVATAR_CELL = Math.floor(
  (SCREEN_W - CARD_PADDING * 2 - GRID_GAP * 3) / 4
);

const AVATAR_PRESETS = [
  'https://api.dicebear.com/9.x/adventurer/png?seed=Aria&size=128',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Felix&size=128',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Luna&size=128',
  'https://api.dicebear.com/9.x/adventurer/png?seed=Max&size=128',
  'https://api.dicebear.com/9.x/bottts/png?seed=Compass&size=128',
  'https://api.dicebear.com/9.x/bottts/png?seed=Buddy&size=128',
  'https://api.dicebear.com/9.x/thumbs/png?seed=Sunny&size=128',
  'https://api.dicebear.com/9.x/thumbs/png?seed=River&size=128',
];

export default function EditProfileScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { profile, updateProfile } = useAppData();

  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || null);
  const [saving, setSaving] = useState(false);

  const accent = theme.accentGradient?.[0] || '#8B5CF6';
  const accent2 = theme.accentGradient?.[1] || '#6366F1';

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        avatarUrl,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <AnimatedOrbsBackground
        colors={[
          theme.glow + '40',
          theme.accentGradient[0] + '20',
          theme.accentGradient[1] + '20',
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview */}
        <View style={styles.previewWrap}>
          <LinearGradient
            colors={[accent, accent2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewRing}
          >
            <View
              style={[
                styles.previewInner,
                { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
              ]}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.previewImg} />
              ) : (
                <User color={accent} size={52} />
              )}
            </View>
          </LinearGradient>

          <Text style={[styles.previewName, { color: theme.text }]}>
            {name.trim() || 'Your name'}
          </Text>
          <Text style={[styles.previewHint, { color: theme.textSecondary }]}>
            {avatarUrl ? 'Tap a different one below' : 'Pick an avatar below'}
          </Text>
        </View>

        {/* Section: avatars */}
        <View style={styles.sectionHeader}>
          <Sparkles color={accent} size={16} />
          <Text style={[styles.sectionLabel, { color: theme.text }]}>
            Choose your avatar
          </Text>
        </View>

        <View style={styles.avatarGrid}>
          {AVATAR_PRESETS.map((url) => {
            const active = avatarUrl === url;
            return (
              <TouchableOpacity
                key={url}
                onPress={() => setAvatarUrl(url)}
                activeOpacity={0.75}
                style={styles.avatarCellTouch}
              >
                <View
                  style={[
                    styles.avatarCell,
                    {
                      width: AVATAR_CELL,
                      height: AVATAR_CELL,
                      borderColor: active ? accent : theme.border,
                      borderWidth: active ? 3 : 1,
                      backgroundColor: theme.card,
                    },
                  ]}
                >
                  <Image source={{ uri: url }} style={styles.avatarImg} />
                  {active && (
                    <View style={[styles.avatarCheck, { backgroundColor: accent }]}>
                      <Check color="#fff" size={11} strokeWidth={3.5} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {avatarUrl ? (
          <TouchableOpacity
            onPress={() => setAvatarUrl(null)}
            style={styles.clearRow}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color="#EF4444" />
            <Text style={styles.clearText}>Remove avatar</Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Name */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          FULL NAME
        </Text>
        <View
          style={[
            styles.inputContainer,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <User color={accent} size={18} style={styles.icon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {/* Email */}
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
          EMAIL
        </Text>
        <View
          style={[
            styles.inputContainer,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Mail color={accent} size={18} style={styles.icon} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <ADHDButton
          title={saving ? 'Saving…' : 'Save Changes'}
          onPress={handleSave}
          style={styles.button}
          disabled={saving}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: CARD_PADDING,
    paddingTop: 32,
    paddingBottom: 60,
  },

  previewWrap: { alignItems: 'center', marginBottom: 26 },
  previewRing: {
    width: 118,
    height: 118,
    borderRadius: 59,
    padding: 3,
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  previewInner: {
    flex: 1,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImg: { width: '100%', height: '100%' },
  previewName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  previewHint: { fontSize: 12, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingLeft: 2,
  },
  sectionLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },

  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 10,
  },
  avatarCellTouch: {},
  avatarCell: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  avatarImg: { width: '84%', height: '84%', borderRadius: 16 },
  avatarCheck: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  clearRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  clearText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },

  divider: { height: 1, marginVertical: 20 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 54,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },

  button: { width: '100%', marginTop: 12 },
});