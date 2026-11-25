// backend/services/ai/coachLinks.js
//
// Screens the coach is allowed to link to with  [[link: Key | Button label]].
// The keys here MUST match the keys in src/utils/coachNav.js on the frontend.

const LINK_CATALOG = {
  Tasks: 'the user\'s tasks and their subtasks',
  Habits: 'daily habits and streaks',
  Timeline: 'today\'s schedule of tasks, habits and focus sessions',
  Focus: 'focus timer with background sounds',
  Rewards: 'coins, themes and unlockable music',
  ImmediateRelief: 'menu of quick calming exercises',
  Balloon: 'slow-breathing balloon exercise to settle the body (anger, anxiety)',
  Splash: 'a 30-second cooling reset',
  Grounding: '5-4-3-2-1 sensory grounding (overwhelm, panic, anxiety)',
  Ripples: 'tap gentle tones for emotional release (sadness, heaviness)',
  Soundscapes: 'calm classical / ancient instrumental tracks',
  NBack: 'working-memory brain game',
  Stroop: 'attention and impulse-control game',
  PatternRecall: 'pattern memory game',
  RabbitHunter: 'focus and attention game',
  TongueTwister: 'fun speech warm-up game',
  EmotionRegulation: 'emotion regulation hub',
};

const LINK_KEYS = Object.keys(LINK_CATALOG);

function formatLinkCatalog() {
  return LINK_KEYS.map((k) => `- ${k}: ${LINK_CATALOG[k]}`).join('\n');
}

// Pull every [[link: Key | Label]] out of a reply. Unknown keys are dropped.
function extractLinks(text) {
  const links = [];
  const re = /\[\[\s*link\s*:\s*([A-Za-z]+)\s*\|\s*([^\]]+?)\s*\]\]/gi;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) {
    const key = LINK_KEYS.find((k) => k.toLowerCase() === m[1].toLowerCase());
    if (key && !links.some((l) => l.key === key)) {
      links.push({ key, label: m[2].slice(0, 40) });
    }
    if (links.length >= 2) break;
  }
  return links;
}

module.exports = { LINK_CATALOG, LINK_KEYS, formatLinkCatalog, extractLinks };