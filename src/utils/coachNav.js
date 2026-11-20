// src/utils/coachNav.js
//
// Lets the AI coach open app screens from chat buttons, and remembers
// whether to show the floating "Back to coach" chip.
//
// The keys here MUST match the keys in backend/services/ai/coachLinks.js.

// Bottom-tab screens (they live under the "MainTabs" stack screen)
const TAB_LINKS = {
  Tasks: 'Tasks',
  Habits: 'Habits',
  Timeline: 'Timeline',
  Focus: 'Focus',
};

// Normal stack screens (opened on top of the chat, so the back arrow returns to it)
const STACK_LINKS = {
  Rewards: 'Rewards',
  ImmediateRelief: 'ImmediateRelief',
  EmotionRegulation: 'EmotionRegulation',
  Balloon: 'BalloonSession',
  Splash: 'SplashSession',
  Grounding: 'GroundingSession',
  Ripples: 'HarmonicRipples',
  Meditation: 'MeditationSession',
  Soundscapes: 'Soundscapes',
  NBack: 'NBackGame',
  Stroop: 'StroopGame',
  PatternRecall: 'PatternRecallGame',
  RabbitHunter: 'RabbitHunter',
  TongueTwister: 'TongueTwisterGame',
};

// ---- "Back to coach" chip state (tiny global store) ----
let returnActive = false;
const listeners = new Set();

export function getCoachReturn() {
  return returnActive;
}

export function setCoachReturn(value) {
  returnActive = !!value;
  listeners.forEach((fn) => fn(returnActive));
}

export function subscribeCoachReturn(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---- Open a link coming from the coach ----
export function openCoachLink(navigation, key) {
  if (TAB_LINKS[key]) {
    // Tabs have no back arrow, so show the chip. The chat is rebuilt from the
    // database when the user comes back, so nothing is lost.
    setCoachReturn(true);
    if (typeof navigation.popTo === 'function') {
      navigation.popTo('MainTabs', { screen: TAB_LINKS[key] });
    } else {
      navigation.navigate('MainTabs', { screen: TAB_LINKS[key] });
    }
    return true;
  }

  if (STACK_LINKS[key]) {
    setCoachReturn(false);
    navigation.navigate(STACK_LINKS[key]);
    return true;
  }

  console.warn('openCoachLink: unknown key', key);
  return false;
}