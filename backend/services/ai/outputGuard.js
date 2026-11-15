// backend/services/ai/outputGuard.js
//
// Layer 5 (Output safety) of the AI coach. Runs AFTER the LLM agent and BEFORE
// the reply is saved or sent. Pure and deterministic: no network, no database,
// no LLM call.
//
// It looks for three things the app must never say:
//   1. diagnosis      - telling the user they have (or are) a condition
//   2. medication     - advice to start/stop/change medication, or dose numbers
//   3. ef_scoring     - ranking executive-function areas ("weakest", "strongest")
//                       or inventing an overall EF score. Only Organization of
//                       Tasks is an exact score, the other six are partial
//                       recoveries, and no overall score exists.
//
// If a rule fires, the whole reply is replaced with a fixed, human-written safe
// reply (English + Roman Urdu, like the Layer 1 replies). Only the rule NAMES
// are returned for logging - never the reply text - to protect user privacy.
//
// FALSE-POSITIVE HANDLING
// A sentence is NOT flagged when it is negated or deferred, so the model can
// still say "I can't tell you whether you have ADHD - a doctor can" or
// "There is no overall EF score".
//
// LIMITS
// This is a keyword safety net, not a classifier. It catches common phrasings
// and will miss unusual ones. The system prompt is still the first line of
// defence; this is the backstop.

const CONDITIONS =
  'adhd|autism|autistic|bipolar|ocd|dyslexia|depression|anxiety disorder';

// Sentence is safe when it denies / hedges / hands off to a professional.
const SAFE_CONTEXT = new RegExp(
  [
    "\\b(?:not|never|no|cannot|can't|cant|don't|dont|won't|isn't|aren't|unable|without)\\b",
    "n't\\b",
    '\\b(?:doctor|physician|psychiatrist|pharmacist|prescriber|clinician|professional|specialist|gp)\\b',
  ].join('|'),
  'i'
);

// "whether you have ADHD" / "if you have ADHD" is hypothetical, so it is fine
// for the diagnosis rule only. It must NOT excuse "if you feel better, stop
// your meds".
const HYPOTHETICAL = /\b(?:whether|if)\b/i;

const RULES = [
  {
    id: 'diagnosis',
    allowHypothetical: true,
    patterns: [
      new RegExp(
        `\\byou (?:definitely |clearly |probably |likely |certainly |do )?(?:have|has) (?:an? )?(?:${CONDITIONS})\\b`,
        'i'
      ),
      /\byou(?:'re| are) (?:definitely |clearly |probably |likely )?(?:an? )?(?:adhd|autistic|bipolar)\b/i,
      /\bi (?:can )?diagnos(?:e|ed) you\b/i,
    ],
  },
  {
    id: 'medication',
    patterns: [
      /\b(?:stop|quit|skip|increase|decrease|reduce|double|lower|halve|adjust)\b[^.!?\n]{0,25}\b(?:medication|medicine|meds|dose|dosage|ritalin|adderall|methylphenidate|atomoxetine|concerta|vyvanse)\b/i,
      /\b\d+(?:\.\d+)?\s?(?:mg|milligrams?)\b/i,
    ],
  },
  {
    id: 'ef_scoring',
    patterns: [
      /\b(?:weakest|strongest|worst)\b[^.!?\n]{0,40}\b(?:ef\b|executive|dimension)/i,
      /\b(?:ef\b|executive|dimension)[^.!?\n]{0,40}\b(?:weakest|strongest|worst)\b/i,
      /\boverall\b[^.!?\n]{0,20}\b(?:ef|executive[- ]function)\b/i,
      /\b(?:ef|executive[- ]function) (?:total|overall|composite) score\b/i,
    ],
  },
];

const SAFE_FALLBACK_REPLY =
  "I want to be careful here. I can't diagnose any condition, give medication advice, or rank " +
  'your executive-function results. A doctor or mental-health professional is the right person ' +
  'for those questions.\n\n' +
  'What I can do: help you plan your day, break a task into small steps, try a short calming ' +
  'exercise, or write down questions to take to a doctor.\n\n' +
  'Yahan main diagnosis, dawai ke baare mein mashwara, ya executive-function ke nataij ki ' +
  'ranking nahi de sakta. Is ke liye kisi doctor ya mahir se baat karein.\n\n' +
  'Din ka plan banane, kaam ko chhote hisson mein baantne, ek chhota calming exercise karne, ' +
  'ya doctor ke liye sawal likhne mein main madad ke liye yahan hoon.';

// Replies from the agent are normally a string, but LangChain can return an
// array of content blocks. Pull the text out so the rules can run on it.
function textOf(reply) {
  if (typeof reply === 'string') return reply;
  if (Array.isArray(reply)) {
    return reply
      .map((part) => (typeof part === 'string' ? part : part && typeof part.text === 'string' ? part.text : ''))
      .join(' ');
  }
  return '';
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string|Array} reply raw reply from the agent
 * @returns {{ ok: boolean, reply: string|Array, flags: string[] }}
 *   ok === true  -> reply is unchanged
 *   ok === false -> reply is the fixed safe reply; flags lists the rule names
 */
function checkReply(reply) {
  const text = textOf(reply);
  if (!text.trim()) return { ok: true, reply, flags: [] };

  const sentences = splitSentences(text);
  const flags = [];

  for (const rule of RULES) {
    const hit = sentences.some(
      (sentence) =>
        !SAFE_CONTEXT.test(sentence) &&
        !(rule.allowHypothetical && HYPOTHETICAL.test(sentence)) &&
        rule.patterns.some((re) => re.test(sentence))
    );
    if (hit) flags.push(rule.id);
  }

  if (flags.length === 0) return { ok: true, reply, flags: [] };
  return { ok: false, reply: SAFE_FALLBACK_REPLY, flags };
}

module.exports = {
  checkReply,
  SAFE_FALLBACK_REPLY,
  // exported for tests
  textOf,
};