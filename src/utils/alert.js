// src/utils/alert.js
//
// One way to tell the user something.
//
//   showAlert(title, message)                       -> a themed nudge (toast) that fades by itself
//                                                      and can be tapped away
//   showAlert(title, message, [cancel, action])     -> a real two-button dialog (needs a decision)
//   showConfirm(...)                                -> the same dialog as a promise
//   notify('success' | 'error' | 'info', title, message)
//
// Why: Alert.alert() with no buttons shows a white dialog on Android that has no OK button and
// cannot be dismissed. Information never needs a dialog, so it is now always a nudge.

import { Alert, Platform } from 'react-native';
import Toast from 'react-native-toast-message';

function guessType(title = '') {
  const t = String(title).toLowerCase();
  if (/(✅|success|saved|done|unlocked|created|updated)/.test(t)) return 'success';
  if (/(❌|fail|error|invalid|not enough|missing|wrong|do not match|couldn|could not|requirements|check)/.test(t)) return 'error';
  return 'info';
}

export function notify(type, title, message, opts = {}) {
  const text = message ? String(message) : '';
  Toast.show({
    type,
    text1: title,
    text2: text || undefined,
    // longer messages stay a little longer
    visibilityTime: opts.visibilityTime ?? Math.min(7000, 2600 + text.length * 35),
    topOffset: opts.topOffset ?? 56,
  });
}

export function showAlert(title, message, buttons = []) {
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionable = buttons.find((b) => b.style !== 'cancel');

  // Information only: a nudge
  if (!actionable) {
    notify(guessType(title), title, message);
    return;
  }

  if (Platform.OS === 'web') {
    const confirmed = cancelBtn ? window.confirm(`${title}\n\n${message}`) : true;
    if (confirmed) actionable.onPress?.();
    else cancelBtn?.onPress?.();
    return;
  }

  // A decision: always dismissible (tap outside / back button)
  Alert.alert(title, message, buttons, { cancelable: true });
}

/** Promise-based confirmation. Resolves true if the user confirms. */
export function showConfirm(title, message, confirmLabel = 'OK', cancelLabel = 'Cancel') {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
