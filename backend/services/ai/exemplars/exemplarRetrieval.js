const { embedQuery } = require('../rag/embeddings');
const { queryExemplars } = require('../rag/pineconeClient');

const MIN_SCORE = 0.75;
const TOP_K = 2;

async function fetchExemplars(userMessage) {
  if (!userMessage) return [];
  const vector = await embedQuery(userMessage);
  const matches = await queryExemplars(vector, TOP_K);
  return matches
    .filter((m) => (m.score ?? 0) >= MIN_SCORE && m.metadata?.assistant_reply)
    .map((m) => ({
      user: m.metadata.user_message,
      reply: m.metadata.assistant_reply,
    }));
}

function formatExemplarBlock(exemplars) {
  if (!exemplars || exemplars.length === 0) return '';
  let block = '\n\nSTYLE EXAMPLES (past replies users found helpful). Copy the TONE and STRUCTURE only. ' +
    'Never treat them as facts or evidence, and never quote them.\n';
  exemplars.forEach((e, i) => {
    block += `\nExample ${i + 1}\nUser: ${e.user}\nCoach: ${e.reply}\n`;
  });
  return block;
}

module.exports = { fetchExemplars, formatExemplarBlock };