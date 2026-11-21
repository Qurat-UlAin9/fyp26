// src/utils/navigationRef.js
//
// Lets components that live outside a screen (like the badge celebration) navigate.
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

// Go back to the chat if it is already in the stack, otherwise open it
export function goToCoach() {
  if (!navigationRef.isReady()) return;
  try {
    if (typeof StackActions.popTo === 'function') {
      navigationRef.dispatch(StackActions.popTo('Chatbot'));
    } else {
      navigationRef.navigate('Chatbot');
    }
  } catch (e) {
    navigationRef.navigate('Chatbot');
  }
}
