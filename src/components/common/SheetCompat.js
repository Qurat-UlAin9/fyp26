// src/components/common/SheetCompat.js
//
// A bottom sheet built on React Native's own Modal. It has the same shape as the two pieces of
// @gorhom/bottom-sheet this app uses (`BottomSheet` and `BottomSheetScrollView`) and the same
// ref methods (expand, snapToIndex, collapse, close), so a screen only needs its import changed.
//
// Why: @gorhom/bottom-sheet needs Reanimated and Gesture Handler to agree on versions. After the
// Expo SDK 58 upgrade the sheets stopped opening on the phone (add task, add habit, focus sounds).
// A Modal depends on neither, so it opens everywhere. The only thing given up is dragging the sheet
// down; it closes with the backdrop, the back button, or the sheet's own close button.

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '../../contexts/ThemeContext';

const DEFAULT_RATIO = 0.6;

/** Colours for sheet content that follow the app theme (used by the Add Task / Add Habit sheets). */
export function sheetColors(theme, isDark) {
  return {
    bg: theme.surface,
    handle: theme.textSecondary,
    text: theme.text,
    muted: theme.textSecondary,
    field: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)',
    fieldBorder: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)',
    accent: theme.accentGradient[0],
  };
}

// Uses the largest snap point, which is where gorhom's expand() goes
function resolveHeight(snapPoints, windowHeight) {
  const list = Array.isArray(snapPoints) ? snapPoints : [snapPoints];
  let best = 0;
  list.forEach((sp) => {
    let h = 0;
    if (typeof sp === 'number') h = sp;
    else if (typeof sp === 'string' && sp.trim().endsWith('%')) h = (windowHeight * parseFloat(sp)) / 100;
    if (Number.isFinite(h) && h > best) best = h;
  });
  return Math.min(windowHeight * 0.95, best > 0 ? best : windowHeight * DEFAULT_RATIO);
}

const BottomSheet = forwardRef(function BottomSheet(
  { snapPoints, enablePanDownToClose = true, onClose, backgroundStyle, handleIndicatorStyle, children },
  ref
) {
  const { height: windowHeight } = useWindowDimensions();
  const { theme } = useTheme();
  const sheetHeight = resolveHeight(snapPoints, windowHeight);

  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const closingRef = useRef(false);
  const progress = useRef(new Animated.Value(0)).current; // 0 = hidden, 1 = shown
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const open = useCallback(() => {
    closingRef.current = false;
    visibleRef.current = true;
    setVisible(true);
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);

  const close = useCallback(() => {
    if (!visibleRef.current || closingRef.current) return;
    closingRef.current = true;
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      visibleRef.current = false;
      closingRef.current = false;
      setVisible(false);
      if (onCloseRef.current) onCloseRef.current();
    });
  }, [progress]);

  useImperativeHandle(
    ref,
    () => ({ expand: open, snapToIndex: open, snapToPosition: open, collapse: close, close }),
    [open, close]
  );

  // Tapping outside or pressing the back button closes the sheet, unless the screen has
  // locked it (for example while a task is being generated)
  const dismiss = useCallback(() => {
    if (enablePanDownToClose) close();
  }, [enablePanDownToClose, close]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Close" />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              { height: sheetHeight },
              backgroundStyle,
              // the app theme always decides the sheet colour (a translucent card colour would show the screen through it)
              { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth },
              { transform: [{ translateY }] },
            ]}
          >
            <View style={styles.handleWrap}>
              <View style={[styles.handle, handleIndicatorStyle, { backgroundColor: theme.textSecondary, opacity: 0.5 }]} />
            </View>
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

export const BottomSheetScrollView = forwardRef(function BottomSheetScrollView(props, ref) {
  return <ScrollView ref={ref} keyboardShouldPersistTaps="handled" {...props} />;
});

export default BottomSheet;

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  kav: { justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  content: { flex: 1 },
});
