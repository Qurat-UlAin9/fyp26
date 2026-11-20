// The ONE place that decides which LLM the app uses.
// Switch with LLM_PROVIDER=gemini or LLM_PROVIDER=groq in backend/.env
const PROVIDER = (process.env.LLM_PROVIDER || 'groq').toLowerCase();

function createChatModel({ temperature = 0.4, maxTokens = 1024 } = {}) {
  if (PROVIDER === 'gemini') {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not set in backend/.env');
    }
    const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
    return new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      temperature,
      maxOutputTokens: maxTokens,
      maxRetries: 4,
    });
  }

  const { ChatGroq } = require('@langchain/groq');
  return new ChatGroq({
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    temperature,
    maxTokens,
  });
}

module.exports = { createChatModel, PROVIDER };