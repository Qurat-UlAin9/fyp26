import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Volume2, VolumeX, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const SNAP_POINTS = ['62%'];

export default function SoundBottomSheet({ sheetRef, sounds, selectedSound, onSelectSound }) {
  const { theme, isDark } = useTheme();

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
  }, [sheetRef]);

  const sheetBg = isDark ? '#0A1628' : '#F8FAFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      enablePanDownToClose
      backgroundStyle={[styles.sheetBackground, { backgroundColor: sheetBg, borderColor }]}
      handleIndicatorStyle={[styles.handle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.1)' }]}>
            <Volume2 size={18} color="#38BDF8" />
          </View>

          <View style={styles.headerText}>
            <Text style={[styles.sheetTitle, { color: isDark ? '#E0F2FE' : '#0F172A' }]}>
              Focus Sounds
            </Text>
            <Text style={[styles.sheetSubtitle, { color: isDark ? '#475569' : '#94A3B8' }]}>
              {selectedSound ? 'Sound is playing' : 'Choose an ambient sound'}
            </Text>
          </View>

          {/* X close button */}
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            style={[
              styles.closeButton,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' },
            ]}
          >
            <X size={16} color={isDark ? '#64748B' : '#94A3B8'} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Stop sound pill — only shown when a sound is active */}
        {!!selectedSound && (
          <TouchableOpacity
            onPress={() => onSelectSound(selectedSound)}
            activeOpacity={0.8}
            style={[
              styles.stopPill,
              {
                backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : 'rgba(239,68,68,0.08)',
                borderColor: isDark ? 'rgba(248,113,113,0.3)' : 'rgba(239,68,68,0.25)',
              },
            ]}
          >
            <VolumeX size={14} color="#F87171" strokeWidth={2.2} />
            <Text style={styles.stopPillText}>Stop Sound</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }]} />

        {/* Sound cards */}
        {sounds.map((sound) => {
          const active = selectedSound === sound.key;
          return (
            <TouchableOpacity
              key={sound.key}
              onPress={() => onSelectSound(sound.key)}
              activeOpacity={0.8}
              style={styles.cardTouch}
            >
              {active ? (
                <LinearGradient
                  colors={['rgba(34,211,238,0.18)', 'rgba(167,139,250,0.18)']}
                  style={[styles.soundCard, styles.activeCard, { borderColor: 'rgba(56,189,248,0.45)' }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <SoundCardInner sound={sound} active={active} isDark={isDark} theme={theme} />
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.soundCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
                    },
                  ]}
                >
                  <SoundCardInner sound={sound} active={active} isDark={isDark} theme={theme} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.bottomPad} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function SoundCardInner({ sound, active, isDark, theme }) {
  return (
    <View style={styles.cardInner}>
      <View style={[
        styles.emojiBox,
        {
          backgroundColor: active
            ? 'rgba(56,189,248,0.2)'
            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
        },
      ]}>
        <Text style={styles.emoji}>{sound.emoji}</Text>
      </View>

      <View style={styles.cardLabels}>
        <Text style={[styles.soundLabel, { color: active ? '#38BDF8' : isDark ? '#CBD5E1' : '#1E293B' }]}>
          {sound.label}
        </Text>
        <Text style={[styles.soundDesc, { color: active ? 'rgba(56,189,248,0.7)' : isDark ? '#475569' : '#94A3B8' }]}>
          {sound.description}
        </Text>
      </View>

      {active && (
        <View style={styles.checkCircle}>
          <Check size={14} color="#38BDF8" strokeWidth={2.5} />
        </View>
      )}

      {active && <PlayingBars />}
    </View>
  );
}

function PlayingBars() {
  return (
    <View style={styles.bars}>
      {[0.6, 1, 0.75, 0.9, 0.5].map((h, i) => (
        <View key={i} style={[styles.bar, { height: 14 * h, opacity: 0.7 + i * 0.06 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 12,
  },
  stopPillText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  cardTouch: {
    marginBottom: 10,
  },
  soundCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activeCard: {
    borderWidth: 1.5,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  cardLabels: {
    flex: 1,
  },
  soundLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  soundDesc: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(56,189,248,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 18,
    marginRight: 2,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#38BDF8',
  },
  bottomPad: {
    height: 80,
  },
});