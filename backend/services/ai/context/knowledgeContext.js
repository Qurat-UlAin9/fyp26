// backend/services/ai/context/knowledgeContext.js
//
// Retrieves knowledge-base passages for the user's message BEFORE the model
// answers, and formats them as a prompt block. One embedding + one vector query,
// no extra model call. The model is told to use the passages as grounding and
// to paraphrase them, not quote them.

const { retrieveKnowledge } = require('../tools/knowledgeTool');

const MAX_ITEMS = 4;
const MAX_CHARS_PER_ITEM = 700;
const SHORT_MESSAGE_WORDS = 6;

// Chat messages are chattier than the queries the search tool writes, so their similarity
// scores are lower. Tune with RAG_MIN_SCORE in .env (the log prints the real scores).
const MIN_SCORE = Number(process.env.RAG_MIN_SCORE) || 0.58;

// The library is about ADHD and wellbeing. For plain subject questions ("explain transformers")
// only a very close match may be used, so unrelated tips are not mixed into the answer.
const SUBJECT_MIN_SCORE = Number(process.env.RAG_SUBJECT_MIN_SCORE) || 0.72;
const WELLBEING_WORDS = /\b(adhd|add|focus|focusing|distract\w*|procrastinat\w*|motivat\w*|overwhelm\w*|anxi\w*|stress\w*|sad|depress\w*|angry|anger|tired|exhaust\w*|burn\s?out|sleep\w*|habits?|routine|impuls\w*|emotion\w*|feel|feeling|feelings|mood|lonely|shame|guilt|panic\w*|calm|worr\w*|cop(e|ing)|therapy|medication|forget\w*|restless|mental|self-esteem|rejection|executive|time blindness|start(ing)? (a )?task|can'?t (start|focus|stop|sleep)|struggl\w*|hard to)\b/i;

const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

// Messages that are not a topic: replies like "yes", app-generated events, etc.
function shouldSearch(message) {
  const text = String(message || '').trim();
  if (wordCount(text) < 3) return false;
  if (/^i finished\b/i.test(text)) return false; // sent by the app after an exercise
  return true;
}

// Short follow-ups ("tell me more", "why?") borrow the previous user message
function buildQuery(message, history = []) {
  const text = String(message || '').trim();
  if (wordCount(text) >= SHORT_MESSAGE_WORDS) return text;
  const prevUser = [...history].reverse().find((m) => m.sender === 'user' && m.message);
  return prevUser ? `${String(prevUser.message).slice(0, 200)} ${text}` : text;
}

async function fetchKnowledgeContext(message, history = []) {
  if (!shouldSearch(message)) return { items: [], ids: [] };
  const query = buildQuery(message, history);
  const minScore = WELLBEING_WORDS.test(query) ? MIN_SCORE : Math.max(MIN_SCORE, SUBJECT_MIN_SCORE);
  const { items, topScores } = await retrieveKnowledge(query, 'all', { minScore });
  const picked = items.slice(0, MAX_ITEMS);
  console.log(`[rag] best raw scores: ${(topScores || []).join(', ') || 'none'} (min ${minScore})`);
  picked.forEach((m, i) => console.log(`[rag] ${i + 1}. (${m.score.toFixed(2)}) [${m.sourceType}] ${m.title}`));
  if (picked.length === 0) console.log('[rag] nothing above the similarity threshold');
  return { items: picked, ids: picked.map((m) => m.id) };
}

// How firmly the coach may state a passage, based on its trust score
function trustNote(trust) {
  const t = Number(trust);
  if (!Number.isFinite(t)) return 'treat as general guidance';
  if (t >= 0.7) return 'evidence-based, you may state it confidently';
  if (t >= 0.4) return 'practitioner advice, hedge it ("a common strategy is...")';
  return 'a popular framing, not scientific fact; present it as an idea, not a finding';
}

function formatKnowledgeBlock(items) {
  if (!items || items.length === 0) {
    return (
      '\n\nREFERENCE KNOWLEDGE: nothing in the library matched this message closely. ' +
      'Answer from your own general knowledge, stay accurate, and say so plainly if you are unsure.\n'
    );
  }
  let block = '\n\nREFERENCE KNOWLEDGE (retrieved from the app\'s research library and curated strategies for this message):\n';
  items.forEach((m, i) => {
    const text = String(m.text).replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS_PER_ITEM);
    block += `\n[${i + 1}] ${m.title} (${m.category}) - ${trustNote(m.trust)}\n${text}\n`;
  });
  block +=
    '\nHOW TO USE THE REFERENCE KNOWLEDGE: ground your facts, explanations and strategies in it where it fits the ' +
    "user's actual question. Put it in your own simple words and shape it around their situation. Do not quote it, " +
    'do not mention "reference knowledge", numbers in brackets or document names unless the user asks for sources. ' +
    'Passages may contain internal labels such as "Recognize it when:" or "Try saying:"; never reproduce those labels. ' +
    'Respect each passage\'s confidence note. Skip any item that does not really fit. Never invent studies, statistics or quotes beyond what is here.\n';
  return block;
}

module.exports = { fetchKnowledgeContext, formatKnowledgeBlock };
