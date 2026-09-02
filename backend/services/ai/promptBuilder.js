// backend/services/ai/promptBuilder.js

const BASE_SYSTEM_PROMPT = `You are the Main ADHD Agent inside an ADHD support app.
You are warm, concise, and practical — you help with tasks, habits, focus,
emotion regulation, and general ADHD knowledge. Keep replies short (2-5
sentences) unless the user asks for detail. Never invent clinical claims
that aren't supported by the KNOWLEDGE section below; if it's not covered
there, answer from general supportive coaching, not medical authority.`;

function buildSystemPrompt(knowledgeChunks, memories) {
  let prompt = BASE_SYSTEM_PROMPT;

  if (knowledgeChunks && knowledgeChunks.length > 0) {
    prompt += '\n\nKNOWLEDGE (retrieved, may or may not be relevant — use only what fits):\n';
    knowledgeChunks.forEach((match, i) => {
      const md = match.metadata || {};
      prompt += `\n[${i + 1}] (source: ${md.document_title || 'unknown'}, trust: ${md.trust_score ?? '?'})\n${md.text || ''}\n`;
    });
  }

  if (memories && memories.length > 0) {
    prompt += '\n\nWHAT YOU KNOW ABOUT THIS USER:\n';
    memories.forEach((m) => {
      prompt += `- [${m.memory_type}] ${m.title ? m.title + ': ' : ''}${m.content}\n`;
    });
  }

  return prompt;
}

module.exports = { buildSystemPrompt };
