import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';

// Every nudge in the app is drawn here, from the current theme, so light and dark themes both read well.
const ACCENT = {
  success: '#10B981',
  error: '#EF4444',
  info: '#6366F1',
  warning: '#F59E0B',
};

function ThemedToast({ kind, text1, text2, onPress, hide }) {
  const { theme } = useTheme();
  const accent = kind === 'info' ? theme.accentGradient[0] : ACCENT[kind] || ACCENT.info;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        onPress?.();
        (hide || Toast.hide)();
      }}
      style={[
        styles.wrap,
        { backgroundColor: theme.surface || '#1E293B', borderColor: theme.border, shadowColor: theme.glow },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <View style={styles.copy}>
        {text1 ? (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.body, { color: theme.textSecondary }]} numberOfLines={6}>
            {text2}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.close, { color: theme.textSecondary }]}>✕</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 12,
    elevation: 6,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  bar: { width: 5, alignSelf: 'stretch', marginRight: 12, borderRadius: 3 },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800' },
  body: { fontSize: 12.5, fontWeight: '500', marginTop: 2, lineHeight: 17 },
  close: { fontSize: 13, fontWeight: '800', marginLeft: 10 },
});

export const toastConfig = {
  success: (p) => <ThemedToast kind="success" {...p} />,
  error: (p) => <ThemedToast kind="error" {...p} />,
  info: (p) => <ThemedToast kind="info" {...p} />,
  warning: (p) => <ThemedToast kind="warning" {...p} />,
};
