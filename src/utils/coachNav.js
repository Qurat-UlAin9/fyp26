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

// ---- Exercise hand-off: "you finished -> tell the coach -> coach reacts" ----
// Screens that count as an exercise (route name -> friendly label)
export const EXERCISE_LABELS = {
  BalloonSession: 'Balloon Breathing',
  SplashSession: 'Splash reset',
  GroundingSession: 'Grounding',
  HarmonicRipples: 'Harmonic Ripples',
  MeditationSession: 'Guided Meditation',
  NBackGame: 'N-Back game',
  StroopGame: 'Stroop game',
  PatternRecallGame: 'Pattern Recall game',
  RabbitHunter: 'Rabbit Hunter game',
  TongueTwisterGame: 'Tongue Twister game',
};

// Route name of the exercise the coach opened last (null if the user opened it himself)
let openedByCoach = null;

let doneInfo = null; // { routeName, label, fromCoach, summary, goBackOnDismiss }
const doneListeners = new Set();

export function getExerciseDone() {
  return doneInfo;
}

export function subscribeExerciseDone(fn) {
  doneListeners.add(fn);
  return () => doneListeners.delete(fn);
}

// Called by an exercise screen when the user actually finishes it.
// options: { summary?: string, goBackOnDismiss?: boolean }
export function reportExerciseDone(routeName, options = {}) {
  doneInfo = {
    routeName,
    label: EXERCISE_LABELS[routeName] || 'the exercise',
    fromCoach: openedByCoach === routeName,
    summary: options.summary || null,
    goBackOnDismiss: !!options.goBackOnDismiss,
  };
  doneListeners.forEach((fn) => fn(doneInfo));
}

export function dismissExerciseDone() {
  doneInfo = null;
  doneListeners.forEach((fn) => fn(null));
}

// A message the chat should send on the user's behalf as soon as it is shown again
let pendingCoachEvent = null;
const coachEventListeners = new Set();

export function queueCoachEvent(text) {
  pendingCoachEvent = text || null;
  // If the chat is already on screen it can deliver the message right away
  coachEventListeners.forEach((fn) => fn());
}

export function subscribeCoachEvent(fn) {
  coachEventListeners.add(fn);
  return () => coachEventListeners.delete(fn);
}

export function takeCoachEvent() {
  const t = pendingCoachEvent;
  pendingCoachEvent = null;
  return t;
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
    openedByCoach = EXERCISE_LABELS[STACK_LINKS[key]] ? STACK_LINKS[key] : null;
    navigation.navigate(STACK_LINKS[key]);
    return true;
  }

  console.warn('openCoachLink: unknown key', key);
  return false;
}