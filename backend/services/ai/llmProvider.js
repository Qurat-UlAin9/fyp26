// The ONE place that decides which LLM each feature uses.
//
// backend/.env:
//   GOOGLE_API_KEY=...          (Gemini)
//   GROQ_API_KEY=...            (Groq)
//   LLM_PROVIDER=gemini         default for everything: gemini | groq
//
// Optional, per feature (each falls back to LLM_PROVIDER when not set):
//   LLM_PROVIDER_COACH=gemini     the AI coach chat
//   LLM_PROVIDER_TASKS=groq       task breakdown (subtask planner)
//   LLM_PROVIDER_REFRAME=groq     thought reframing
//
// Optional model names (global, or per feature, e.g. GROQ_MODEL_REFRAME):
//   GEMINI_MODEL=gemini-2.5-flash
//   GROQ_MODEL=openai/gpt-oss-120b

function providerFor(purpose) {
  const specific = purpose ? process.env[`LLM_PROVIDER_${String(purpose).toUpperCase()}`] : null;
  return String(specific || process.env.LLM_PROVIDER || 'groq').toLowerCase();
}

function modelNameFor(envBase, purpose, fallback) {
  const specific = purpose ? process.env[`${envBase}_${String(purpose).toUpperCase()}`] : null;
  return specific || process.env[envBase] || fallback;
}

/**
 * @param {{ temperature?: number, maxTokens?: number, purpose?: 'coach'|'tasks'|'reframe'|null }} opts
 */
function createChatModel({ temperature = 0.4, maxTokens = 1024, purpose = null } = {}) {
  const provider = providerFor(purpose);

  if (provider === 'gemini') {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not set in backend/.env');
    }
    const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
    return new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: modelNameFor('GEMINI_MODEL', purpose, 'gemini-2.5-flash'),
      temperature,
      maxOutputTokens: maxTokens,
      maxRetries: 4,
    });
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set in backend/.env');
  }
  const { ChatGroq } = require('@langchain/groq');
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: modelNameFor('GROQ_MODEL', purpose, 'openai/gpt-oss-120b'),
    temperature,
    maxTokens,
  });
}

// Models answer either with a string or with a list of parts (Gemini); always give back plain text
function textOf(content) {
  if (Array.isArray(content)) {
    return content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('');
  }
  return typeof content === 'string' ? content : String(content ?? '');
}

// kept for older imports
const PROVIDER = providerFor(null);

module.exports = { createChatModel, providerFor, textOf, PROVIDER };
