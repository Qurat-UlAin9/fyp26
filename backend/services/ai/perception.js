// backend/services/ai/perception.js
//
// Layer 1 (Perception) of the AI coach. Runs BEFORE the LLM agent and is
// pure/deterministic: no network, no database, no LLM call.
//
// What it does for every incoming chat message:
//   1. Length sanity check   -> too long = polite reply, agent is NOT called
//   2. Crisis keyword check  -> fixed supportive reply, agent is NOT called
//   3. Language detection    -> english | roman_urdu | urdu_script | other
//   4. Intent pre-classification -> tool_request | data_query | knowledge_query | chat
//   5. Urgency signal        -> high (panic / overwhelm) | normal
//
// 3-5 only produce HINTS that are appended to the system prompt; the model
// still makes the final decision.
//
// SAFETY NOTES
// - This is a support/self-reflection app, not a diagnostic or crisis service.
//   The crisis reply is a fixed, human-written message that points the user to
//   a trusted person and to local emergency help. It contains no tool actions,
//   no diagnosis and no advice.
// - Helpline numbers are NOT hard-coded. Set CRISIS_HELPLINE_TEXT in
//   backend/.env to a short, VERIFIED line for your country, e.g.
//     CRISIS_HELPLINE_TEXT=<name of service>: <number>
//   Without it the reply still works (trusted person + local emergency number).
// - The keyword list errs on the side of caution: a figure of speech such as
//   "I'll kill myself if I miss this deadline" will also trigger the supportive
//   reply. A few extra supportive messages are better than a missed crisis.
// - Only English and Roman Urdu are officially supported, but a few Urdu-script
//   phrases are included on purpose because missing a crisis is worse than
//   being broad.

const MAX_MESSAGE_LENGTH = 1000;

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[‘’`]/g, "'") // curly quotes -> straight
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ') // drop punctuation, keep letters (incl. Urdu script)
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// 2. Crisis detection
// ---------------------------------------------------------------------------

// Matched against the normalised message. Plain substrings / small regexes.
const CRISIS_PATTERNS = [
  // English
  /\bsuicid(e|al)\b/,
  /\bkill myself\b/,
  /\bkilling myself\b/,
  /\bend my (own )?life\b/,
  /\btake my (own )?life\b/,
  /\bwant(ed)? to die\b/,
  /\bwanna die\b/,
  /\bdon'?t want to (live|be alive|exist)\b/,
  /\bno reason to (live|go on)\b/,
  /\bbetter off dead\b/,
  /\bend it all\b/,
  /\b(hurt|harm|cut|injure) myself\b/,
  /\bself[- ]?harm\b/,
  /\bhurting myself\b/,

  // Roman Urdu
  /\bkhud ?kushi\b/,
  /\bkhud ?kashi\b/,
  /\bkhudkhushi\b/,
  /\bmar jana chah(ta|ti)\b/,
  /\bmarna chah(ta|ti)\b/,
  /\bmar ja(o|u)n\b/,
  /\bmar jaana chah(ta|ti)\b/,
  /\bjeena nahi chah(ta|ti)\b/,
  /\bjeena nahin chah(ta|ti)\b/,
  /\bjeene ka (mann?|dil|mood) nahi\b/,
  /\bzindagi khatam\b/,
  /\bzindagi (se )?tang\b/,
  /\bapni jaan (le|lena|de|dena)\b/,
  /\bjaan de ?(d|n)\b/,
  /\bkhud ko (khatam|maar|mar|nuqsan|hurt|kaat)\b/,
  /\bapne aap ko (khatam|maar|nuqsan|hurt)\b/,

  // Urdu script (not officially supported, but included for safety)
  /خودکشی/,
  /خود کشی/,
  /مرنا چاہتا/,
  /مرنا چاہتی/,
  /جینا نہیں چاہتا/,
  /جینا نہیں چاہتی/,
  /اپنی جان/,
];

function detectCrisis(message) {
  const text = normalize(message);
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

// ---------------------------------------------------------------------------
// 3. Language detection (hint only)
// ---------------------------------------------------------------------------

// Words that are common in Roman Urdu and rare in English. Ambiguous ones
// ("main", "may", "ho", "par", "kar" as a name) are intentionally left out.
const ROMAN_URDU_WORDS = new Set([
  'hai', 'hain', 'nahi', 'nahin', 'mujhe', 'mujhay', 'mjhe', 'mera', 'meri', 'mere',
  'kya', 'kyun', 'kyu', 'kaise', 'kese', 'kesay', 'hoon', 'hun', 'raha', 'rahi', 'rahay',
  'karna', 'karo', 'karta', 'karti', 'bohat', 'bohot', 'bahut', 'acha', 'achha', 'theek',
  'thek', 'mushkil', 'pareshan', 'aur', 'aap', 'tum', 'lag', 'laga', 'lagta', 'lagti',
  'mein', 'kuch', 'koi', 'abhi', 'aaj', 'kal', 'kaam', 'parhai', 'padhai', 'chahta',
  'chahti', 'chahiye', 'hota', 'hoti', 'bhi', 'wala', 'wali', 'zyada', 'thora', 'thoda',
  'samajh', 'yaar', 'dil', 'dimaag', 'dimagh', 'ghabrahat', 'ghabra', 'sakta', 'sakti',
  'banao', 'batao', 'bata', 'dedo', 'shuru', 'khatam', 'kyunke', 'lekin', 'magar', 'toh',
]);

function detectLanguage(message) {
  const raw = String(message || '');

  if (/[؀-ۿ]/.test(raw)) return 'urdu_script';

  // Any other non-Latin script (Arabic-Indic is covered above)
  const letters = raw.match(/\p{L}/gu) || [];
  const nonLatin = letters.filter((ch) => !/\p{Script=Latin}/u.test(ch));
  if (letters.length > 0 && nonLatin.length / letters.length > 0.4) return 'other';

  const words = normalize(raw).split(' ').filter(Boolean);
  if (words.length === 0) return 'english';

  const hits = words.filter((w) => ROMAN_URDU_WORDS.has(w)).length;
  if (hits >= 2 && hits / words.length >= 0.2) return 'roman_urdu';
  if (hits >= 1 && words.length <= 2) return 'roman_urdu';
  return 'english';
}

// ---------------------------------------------------------------------------
// 4. Intent pre-classification (hint only)
// ---------------------------------------------------------------------------

const INTENT_RULES = [
  [
    'tool_request',
    /\b(add|create|make|set|start|schedule|remind|delete|remove|update|mark)\b.*\b(task|habit|reminder|timer|focus|session)\b|\b(task|habit|focus)\b.*\b(banao|bana do|shuru|add karo|delete karo)\b|\bremind me\b/,
  ],
  [
    'data_query',
    /\b(my|mere|meri|mera) (open |pending |current |today'?s |upcoming )?(tasks?|habits?|streaks?|progress|focus minutes|deadlines?)\b|\bwhat('?s| is) due\b|\bhow many (tasks|habits|sessions|minutes)\b|\bkitne (tasks?|habits?)\b/,
  ],
  [
    'knowledge_query',
    /\b(why|how does|how do|what is|what are|what causes|explain|research|evidence|study|studies|science)\b|\b(kyun|kyu|kaise|kese|kya hota|kya hai|samjhao)\b/,
  ],
];

function classifyIntent(message) {
  const text = normalize(message);
  for (const [intent, re] of INTENT_RULES) {
    if (re.test(text)) return intent;
  }
  return 'chat';
}

// ---------------------------------------------------------------------------
// 5. Urgency signal (hint only)
// ---------------------------------------------------------------------------

const URGENCY_PATTERNS = [
  /\bpanic(king|ked| attack)?\b/,
  /\boverwhelm(ed|ing)?\b/,
  /\bmelt ?down\b/,
  /\bfalling apart\b/,
  /\bfreaking out\b/,
  /\bcan'?t (cope|breathe|handle|take it|do this)\b/,
  /\btoo much\b/,
  /\bghabra(hat|ya|gaya|gayi)?\b/,
  /\bbohat pareshan\b/,
  /\bsambhal nahi\b/,
  /\bbardasht nahi\b/,
  /\bdimaag (phat|kharab)\b/,
];

function detectUrgency(message) {
  const text = normalize(message);
  return URGENCY_PATTERNS.some((re) => re.test(text)) ? 'high' : 'normal';
}

// ---------------------------------------------------------------------------
// Fixed replies
// ---------------------------------------------------------------------------

function getCrisisReply() {
  const helpline = (process.env.CRISIS_HELPLINE_TEXT || '').trim();
  const helplineLine = helpline ? `\n\n${helpline}` : '';

  return (
    "I'm really glad you told me, and I'm sorry you're hurting this much. " +
    "You don't have to carry this alone.\n\n" +
    'Please reach out to someone you trust right now - a family member, a friend, or a ' +
    'counsellor - and tell them how you are feeling. If you think you might act on these ' +
    'thoughts, or you are in danger, contact your local emergency number or go to the ' +
    'nearest emergency room straight away.' +
    helplineLine +
    '\n\n' +
    'Aap ne mujhe bataya, ye bohat achha kiya. Mujhe afsos hai ke aap itni takleef mein hain. ' +
    'Aap akele nahi hain.\n\n' +
    'Abhi kisi bharose ke insaan (ghar wale, dost ya counsellor) ko apni halat bata dein. ' +
    'Agar aap ko lagta hai ke aap khud ko nuqsan pahuncha sakte hain, ya aap khatre mein hain, ' +
    'to abhi apne mulk ka emergency number milayen ya qareebi hospital ki emergency mein jayen.\n\n' +
    "When you feel able, I'm here to keep talking. / Jab aap tayyar hon, main yahan hoon."
  );
}

const TOO_LONG_REPLY =
  `That message is a bit long for me to follow well - could you shorten it to under ${MAX_MESSAGE_LENGTH} ` +
  `characters, or send it in two parts?\n\n` +
  `Ye message thora lamba hai - kya aap ise ${MAX_MESSAGE_LENGTH} huroof se kam kar ke, ya do hisson mein bhej sakte hain?`;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * @param {string} message raw user message (already trimmed by the caller is fine)
 * @returns {{
 *   ok: boolean,
 *   reason?: 'too_long' | 'crisis',
 *   reply?: string,
 *   crisis: boolean,
 *   hints: { language: string, intent: string, urgency: string }
 * }}
 *
 * - ok === false  -> do NOT call the LLM agent; send `reply` to the user.
 *   - reason 'too_long': nothing should be saved.
 *   - reason 'crisis'  : save the user message and `reply` like a normal turn.
 * - ok === true   -> continue to the agent and pass `hints` along.
 */
function analyzeMessage(message) {
  const text = String(message || '').trim();

  // Crisis wins over everything else, including the length check, so a long
  // distressed message is never bounced with "please shorten".
  if (detectCrisis(text)) {
    return {
      ok: false,
      reason: 'crisis',
      reply: getCrisisReply(),
      crisis: true,
      hints: { language: detectLanguage(text), intent: 'chat', urgency: 'high' },
    };
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      reason: 'too_long',
      reply: TOO_LONG_REPLY,
      crisis: false,
      hints: { language: 'english', intent: 'chat', urgency: 'normal' },
    };
  }

  return {
    ok: true,
    crisis: false,
    hints: {
      language: detectLanguage(text),
      intent: classifyIntent(text),
      urgency: detectUrgency(text),
    },
  };
}

/**
 * Turns the hints into a short block appended to the system prompt.
 * Returns '' when there is nothing useful to add.
 */
function formatHintsForPrompt(hints) {
  if (!hints) return '';

  const lines = [];

  if (hints.language === 'roman_urdu') {
    lines.push('- Language: the user writes Roman Urdu. Reply in simple Roman Urdu (Urdu in English letters).');
  } else if (hints.language === 'urdu_script' || hints.language === 'other') {
    lines.push(
      '- Language: the user wrote in a language the app does not officially support yet. ' +
        'Reply simply and kindly in the same language if you can, otherwise in English.'
    );
  }

  if (hints.intent && hints.intent !== 'chat') {
    lines.push(`- Likely intent: ${hints.intent} (a guess only - use your own judgment).`);
  }

  if (hints.urgency === 'high') {
    lines.push(
      '- Urgency: the user sounds overwhelmed or panicked. Validate in one short sentence first, ' +
        'keep the whole reply very short and calm, prefer suggest_emotion_exercise, and do not ' +
        'create tasks or long lists unless they ask.'
    );
  }

  if (lines.length === 0) return '';
  return '\n\nAUTOMATIC SIGNALS FOR THIS MESSAGE (hints only):\n' + lines.join('\n');
}

module.exports = {
  analyzeMessage,
  formatHintsForPrompt,
  // exported for tests
  detectCrisis,
  detectLanguage,
  classifyIntent,
  detectUrgency,
  getCrisisReply,
  MAX_MESSAGE_LENGTH,
};


