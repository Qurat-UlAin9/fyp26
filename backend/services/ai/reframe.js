// backend/services/ai/reframe.js
//
// Thought reframing. This is NOT the coach chat: the user writes a thought that is hurting them and
// gets it back restructured (what kind of thinking trap it is, questions to test it, a balanced
// version, one tiny action). It has its own prompt, its own model setting (LLM_PROVIDER_REFRAME) and
// uses no tools, no tasks and no research library (RAG).

const { createChatModel, textOf } = require('./llmProvider');

let model = null;
function getModel() {
  if (!model) model = createChatModel({ temperature: 0.5, maxTokens: 1200, purpose: 'reframe' });
  return model;
}

const DISTORTIONS = [
  'All-or-nothing thinking', 'Overgeneralising', 'Mind reading', 'Fortune telling', 'Catastrophising',
  'Emotional reasoning', 'Should statements', 'Labelling', 'Personalising', 'Discounting the positive',
  'Mental filter',
];

const SYSTEM_PROMPT = `You are a gentle thought-reframing tool inside an ADHD support app. The user writes one thought that is hurting them. You do not chat and you do not give general advice: you restructure the thought, step by step, the way a good CBT thought record does.

Return ONLY one JSON object, no markdown, in exactly this shape:
{
  "validation": string,
  "thought": string,
  "distortions": [{ "name": string, "why": string }],
  "questions": [string, string, string],
  "evidence": { "for": [string], "against": [string] },
  "balanced": string,
  "action": string
}

Field rules:
- validation: ONE warm sentence about the feeling behind the thought, in your own words. Do not repeat the thought and do not say "I understand".
- thought: the user's thought as one short, clear sentence in first person.
- distortions: 1 to 3 items. "name" must be one of: ${DISTORTIONS.join('; ')}. "why" is one sentence that points at the exact words in the thought that show it.
- questions: exactly 3 short Socratic questions that help the user test the thought themselves (for example: "What would you say to a friend who thought this?", "What is one time this was not completely true?"). Fit them to this thought.
- evidence: up to 3 short items in "for" and up to 3 in "against". Use only what the user wrote or very general facts about people. Never invent events from their life.
- balanced: a believable alternative thought in first person, at most 30 words. It must be honest, not toxic positivity, and it should still acknowledge what is hard.
- action: one tiny, concrete action that takes under 10 minutes and fits the thought (ADHD-friendly: specific, small, no willpower needed).

General rules:
- Write in the same language as the user (English or Roman Urdu). Keep sentences short.
- Never diagnose, never mention ADHD as a cause of the thought, never give medication advice.
- If the user's text shows they may harm themselves, return exactly {"crisis": true} and nothing else.
- If the user gives feedback on a previous result, produce a NEW version that takes the feedback into account.`;

function parseJson(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const tryParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };
  let out = tryParse(text);
  if (!out || typeof out !== 'object') {
    const m = text.match(/\{[\s\S]*\}/);
    out = m ? tryParse(m[0]) : null;
  }
  return out && typeof out === 'object' && !Array.isArray(out) ? out : null;
}

const str = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
const list = (v, n, max) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

function normalize(parsed) {
  if (!parsed) return null;
  if (parsed.crisis === true) return { crisis: true };

  const distortions = (Array.isArray(parsed.distortions) ? parsed.distortions : [])
    .map((d) => ({ name: str(d?.name, 40), why: str(d?.why, 200) }))
    .filter((d) => d.name)
    .slice(0, 3);

  const result = {
    validation: str(parsed.validation, 220),
    thought: str(parsed.thought, 240),
    distortions,
    questions: list(parsed.questions, 3, 160),
    evidence: {
      for: list(parsed.evidence?.for, 3, 160),
      against: list(parsed.evidence?.against, 3, 160),
    },
    balanced: str(parsed.balanced, 260),
    action: str(parsed.action, 220),
  };
  // a result without a balanced thought is useless
  return result.balanced ? result : null;
}

/**
 * @param {{ thought: string, situation?: string, feedback?: string, previous?: object }} input
 * @returns {Promise<object>} the normalized reframe, or { crisis: true }
 */
async function reframeThought({ thought, situation, feedback, previous }) {
  const lines = [`Thought: "${str(thought, 1000)}"`];
  if (situation) lines.push(`Situation: ${str(situation, 400)}`);
  if (previous?.balanced) {
    lines.push(`Previous balanced thought (the user was not satisfied): "${str(previous.balanced, 260)}"`);
  }
  if (feedback) lines.push(`User feedback on it: ${str(feedback, 400)}`);
  lines.push('', 'Return the JSON object now.');

  const invoke = () =>
    Promise.race([
      getModel().invoke([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: lines.join('\n') },
      ]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('The model took too long. Try again.')), 30000)),
    ]);

  // One retry: models occasionally return text that is not valid JSON
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await invoke();
    const result = normalize(parseJson(textOf(res?.content)));
    if (result) return result;
  }
  throw new Error('Could not restructure that thought. Please try rewording it.');
}

module.exports = { reframeThought, DISTORTIONS };
