// backend/services/ai/llmClient.js
//
// TEMPORARY: using Groq (free, no billing required) instead of Anthropic
// while you're testing without API credits. Same function signature as
// before (getChatCompletion(systemPrompt, messages)), so agent.js and
// routes/ai.js don't need any changes.
//
// Get a free key at https://console.groq.com (no card required).
// Env: GROQ_API_KEY
//
// To switch back to Anthropic later: restore the previous version of
// this file (Anthropic SDK, model: 'claude-sonnet-5') once billing is
// set up — everything else in the codebase stays identical either way.

const GROQ_MODEL = 'openai/gpt-oss-120b';

/**
 * @param {string} systemPrompt
 * @param {{role: 'user'|'assistant', content: string}[]} messages
 */
async function getChatCompletion(systemPrompt, messages) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      'GROQ_API_KEY is not set in backend/.env. Get a free key at https://console.groq.com'
    );
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    usage: data.usage,
  };
}

module.exports = { getChatCompletion };
