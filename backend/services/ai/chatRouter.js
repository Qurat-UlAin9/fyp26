// backend/services/ai/chatRouter.js
//
// Decides which "lane" a chat message belongs to, BEFORE the model is called. Each lane has its own
// prompt, its own tools and its own rules for buttons and screen links, so a question about ADHD is
// answered from the research library without task tools or button menus, and a task request is
// handled by the task planner without emotional advice mixed in.
//
//   task       create / change / break down / tick tasks and steps, and coaching on a step
//   action     habits, focus sessions, coins and themes, the coach's name
//   support    the user is sharing a feeling or a struggle (uses the research library too)
//   knowledge  the user wants to understand something (ADHD, focus, emotions, habits, study skills)
//   chat       small talk and short replies
//
// Pure and deterministic: no network, no database, so it can be unit tested. The lane is saved on each
// assistant message, so a short reply such as "yes" or a tapped button stays in the same lane.

const LANES = ['task', 'action', 'support', 'knowledge', 'chat'];

// What each lane may put on the reply. The server enforces this after the model answers, so a lane
// stays clean even when the model adds a marker it should not.
const LANE_POLICY = {
  task: { options: true, linkKeys: ['Tasks', 'Timeline', 'Focus'] },
  action: { options: true, linkKeys: ['Habits', 'Focus', 'Rewards', 'Timeline', 'Tasks', 'Soundscapes'] },
  support: {
    options: true,
    linkKeys: [
      'ImmediateRelief', 'Balloon', 'Splash', 'Grounding', 'Ripples', 'Meditation', 'Soundscapes',
      'EmotionRegulation', 'Focus', 'Tasks',
    ],
  },
  knowledge: { options: false, linkKeys: [] },
  chat: { options: false, linkKeys: [] },
};

const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const wordCount = (t) => norm(t).split(' ').filter(Boolean).length;

const TASK_NOUN =
  '(?:tasks?|assignments?|homework|projects?|essays?|reports?|exams?|quiz(?:zes)?|presentations?|steps?|sub-?tasks?|study plan|to-?dos?)';

// Always a request, whatever the sentence looks like
const TASK_PATTERNS = [
  /\b(?:break|split)\b[^.?!]{0,25}\b(?:down|into)\b/, // "break it down", "split this into steps"
  /\b(?:my|open|pending|current|today's|upcoming|next)\s+(?:tasks?|assignments?|steps?|sub-?tasks?|to-?dos?|deadlines?)\b/,
  /\bwhat(?:'s| is) due\b|\bwhat should i (?:do|work on) (?:now|next)\b|\bnext step\b/,
  /\b(?:task|assignment|homework)\b[^.?!]{0,20}\b(?:banao|bana do|add karo|delete karo)\b/,
];

// A verb next to a task word is a request ("add a task"), unless the sentence is a general question
// about the world ("why do people with ADHD struggle to start tasks")
const TASK_VERB_PATTERN = new RegExp(
  `\\b(?:add|create|make|new|plan|schedule|reschedule|move|delete|remove|update|change|mark|finish(?:ed)?|complete(?:d)?|tick|start|work on|done with)\\b[^.?!]{0,40}\\b${TASK_NOUN}\\b`
);
const GENERAL_QUESTION = /^(?:why|what|how|is|are|does|do)\b/;
const PERSONAL_REQUEST = /\b(?:my|me|i|i'm|can you|could you|please|help)\b/;
const isGeneralQuestion = (t) => GENERAL_QUESTION.test(t) && !PERSONAL_REQUEST.test(t);

const ACTION_PATTERNS = [
  /\b(?:add|create|make|set up|start|track|build|delete|remove|update|change|log|tick|mark)\b[^.?!]{0,40}\b(?:habits?)\b/,
  /\b(?:my )?(?:habits?|streaks?)\b[^.?!]{0,20}\b(?:list|status|how am i|progress)\b/,
  /\bi (?:did|completed|finished|meditated|journaled|walked|exercised|worked out|drank)\b[^.?!]{0,30}\b(?:habit|today|walk|meditation|workout|journal)\b/,
  /\b(?:start|begin|set|run|schedule)\b[^.?!]{0,30}\b(?:focus|pomodoro|timer|session)\b/,
  /\bfocus (?:session|timer)\b/,
  /\b(?:my coins|coins|badges?|unlock(?:ed)?|buy|purchase|themes?)\b/,
  /\bcall you\b|\byour name\b|\brename you\b/,
];

const QUESTION_PATTERN =
  /\b(?:what is|what are|what causes|what does|why do|why does|why is|why am i|why can'?t|why i|how does|how do|how can|how to|explain|difference between|symptoms?|signs? of|types? of|tips?|strategies|techniques?|ways to|research|evidence|stud(?:y|ies)|science|tell me about|is it normal|meaning of)\b|\b(?:kyun|kyu|kaise|kese|kya hota|kya hai|samjhao)\b/;

const FEELING_PATTERN =
  /\b(?:feel|feeling|feels|felt|afraid|fear|feared|scared|anxious|anxiety|worried|worry|stress(?:ed)?|overwhelm(?:ed|ing)?|sad|lonely|angry|upset|frustrated|ashamed|shame|guilty|guilt|hopeless|exhausted|burn(?:ed|t)? ?out|panic(?:king)?|crying|cry|hate myself|can'?t cope|pareshan|udaas|ghabra\w*|dar lag\w*|thak\w*)\b/;

const FIRST_PERSON = /\b(?:i|i'm|im|i've|ive|my|me|mine|myself|mujhe|mera|meri|mere|main)\b/;

const WELLBEING_TOPIC =
  /\b(?:adhd|add|focus|distract\w*|procrastinat\w*|motivat\w*|executive|time blindness|impuls\w*|emotion\w*|mood|sleep\w*|routine|habit formation|dopamine|medication|therapy|brain|attention)\b/;

const matches = (patterns, text) => patterns.some((re) => re.test(text));

/**
 * @param {{ message: string, hints?: object, fromOption?: boolean, focusContext?: object|null, lastLane?: string|null }} p
 * @returns {{ lane: string, reason: string }}
 */
function routeMessage({ message, hints = null, fromOption = false, focusContext = null, lastLane = null }) {
  const text = norm(message);
  const sticky = LANES.includes(lastLane) ? lastLane : null;

  // The user tapped "Ask coach" on a step: that is task coaching
  if (focusContext && typeof focusContext === 'object') return { lane: 'task', reason: 'focus-context' };

  // Sent by the app when an exercise ends ("I finished Grounding. I feel calmer."); a finished step is a task
  if (/^i finished\b/.test(text) && !matches([new RegExp(`\\b${TASK_NOUN}\\b`)], text)) {
    return { lane: 'support', reason: 'exercise-finished' };
  }

  // Clear requests to do something win over everything else
  const general = isGeneralQuestion(text);
  if (matches(TASK_PATTERNS, text) || (!general && TASK_VERB_PATTERN.test(text))) {
    return { lane: 'task', reason: 'task-request' };
  }
  if (!general && matches(ACTION_PATTERNS, text)) return { lane: 'action', reason: 'action-request' };

  // Short replies and tapped buttons continue the lane the conversation was in
  if (sticky && (fromOption || wordCount(text) <= 3)) return { lane: sticky, reason: 'continue' };

  // Sharing a feeling about oneself
  const urgent = hints?.urgency === 'high';
  if (urgent || (FEELING_PATTERN.test(text) && FIRST_PERSON.test(text))) {
    return { lane: 'support', reason: urgent ? 'urgent' : 'feeling' };
  }

  // Wanting to understand something
  if (hints?.intent === 'knowledge_query' || QUESTION_PATTERN.test(text) || (WELLBEING_TOPIC.test(text) && wordCount(text) >= 4)) {
    return { lane: 'knowledge', reason: 'question' };
  }

  if (FEELING_PATTERN.test(text)) return { lane: 'support', reason: 'feeling' };

  // A longer message with no clear request: if it continues a lane, stay; otherwise treat it as support
  if (wordCount(text) >= 8) return { lane: sticky && sticky !== 'chat' ? sticky : 'support', reason: 'long-default' };
  return { lane: sticky || 'chat', reason: 'default' };
}

// Cut a reply's options and links down to what the lane allows
function applyLanePolicy(lane, { options = [], links = [] }) {
  const policy = LANE_POLICY[lane] || LANE_POLICY.chat;
  return {
    options: policy.options ? options : [],
    links: links.filter((l) => policy.linkKeys.includes(l.key)),
  };
}

module.exports = { LANES, LANE_POLICY, routeMessage, applyLanePolicy };
