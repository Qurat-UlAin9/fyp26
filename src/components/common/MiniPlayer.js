// A small floating player that is visible on every screen while music is loaded.
// Play/pause and a clear stop (✕) button, so the user never has to go back to the screen that started it.

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play, X, Music2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useGlobalAudio } from '../../services/audioPlayer';
import { navigationRef } from '../../utils/navigationRef';

const TAB_ROUTES = ['Home', 'Tasks', 'Focus', 'Timeline', 'Habits'];
const TAB_BAR_HEIGHT = 86; // tab bar: height 72 + bottom 14

export default function MiniPlayer() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { track, isPlaying, toggle, stop } = useGlobalAudio();
  const [routeName, setRouteName] = useState(null);

  useEffect(() => {
    const read = () => setRouteName(navigationRef.getCurrentRoute?.()?.name || null);
    read();
    const unsub = navigationRef.addListener?.('state', read);
    return () => unsub?.();
  }, []);

  // The full Soundscapes screen already has these controls
  if (!track || routeName === 'Soundscapes') return null;

  const onTabs = TAB_ROUTES.includes(routeName);
  const bottom = (onTabs ? TAB_BAR_HEIGHT : 12 + insets.bottom) + 8;

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom }]}>
      <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.glow }]}>
        <View style={[styles.icon, { backgroundColor: theme.accentGradient[0] }]}>
          <Music2 size={16} color="#FFFFFF" />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {track.title}
          </Text>
          {track.subtitle ? (
            <Text style={[styles.sub, { color: theme.textSecondary }]} numberOfLines={1}>
              {track.subtitle}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={toggle} hitSlop={8} style={styles.btn} accessibilityLabel={isPlaying ? 'Pause music' : 'Play music'}>
          {isPlaying ? <Pause size={20} color={theme.text} /> : <Play size={20} color={theme.text} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={stop} hitSlop={8} style={styles.btn} accessibilityLabel="Stop music">
          <X size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginHorizontal: 10 },
  title: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  btn: { padding: 6 },
});
