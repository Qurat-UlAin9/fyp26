// src/utils/alert.js
//
// Cross-platform alert helpers. On web, react-native-web doesn't implement
// Alert.alert -- callbacks never fire. This module falls back to
// window.alert / window.confirm on web and uses Alert.alert on native.

import { Alert, Platform } from 'react-native';

/**
 * Fire-and-forget alert. If a non-cancel button exists, the user's
 * accept/reject response triggers the corresponding onPress.
 */
export function showAlert(title, message, buttons = []) {
  if (Platform.OS === 'web') {
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const actionable = buttons.find((b) => b.style !== 'cancel');

    if (!cancelBtn || !actionable) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      actionable.onPress?.();
    } else {
      cancelBtn.onPress?.();
    }
    return;
  }

  Alert.alert(title, message, buttons);
}

/**
 * Promise-based confirmation. Resolves true if user confirms.
 */
export function showConfirm(title, message, confirmLabel = 'OK', cancelLabel = 'Cancel') {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }

    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]);
  });
}