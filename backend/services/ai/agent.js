// backend/services/ai/agent.js
//
// v1 orchestrator: retrieval + memory + LLM call, no tool-routing yet
// (Task/Habit/Focus/etc tools are the next step — this establishes the
// RAG + memory + conversation plumbing first).

const { supabaseAdmin } = require('../../config/supabase');
const { embedQuery } = require('./rag/embeddings');
const { queryKnowledge } = require('./rag/pineconeClient');
const { buildSystemPrompt } = require('./promptBuilder');
const { getChatCompletion } = require('./llmClient');

const RECENT_MESSAGE_LIMIT = 10;
const KNOWLEDGE_TOP_K = 5;
const MEMORY_LIMIT = 5;

async function getRecentMessages(conversationId) {
  const { data, error } = await supabaseAdmin
    .from('ai_messages')
    .select('sender, message')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(RECENT_MESSAGE_LIMIT);

  if (error) throw error;
  return (data || []).reverse();
}

async function getUserMemories(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_memories')
    .select('memory_type, title, content, importance')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .limit(MEMORY_LIMIT);

  if (error) throw error;
  return data || [];
}

/**
 * @param {{userId: string, conversationId: string, userMessage: string}} params
 * @returns {{reply: string, knowledgeChunks: object[], usage: object}}
 */
async function handleMessage({ userId, conversationId, userMessage }) {
  const startedAt = Date.now();

  // 1. Embed the user's message for retrieval
  const queryVector = await embedQuery(userMessage);

  // 2. Retrieve relevant knowledge from Pinecone
  const knowledgeChunks = await queryKnowledge(queryVector, KNOWLEDGE_TOP_K);

  // 3. Pull what we know about this user
  const memories = await getUserMemories(userId);

  // 4. Pull recent conversation history for continuity
  const history = await getRecentMessages(conversationId);

  // 5. Build prompt and call the LLM
  const systemPrompt = buildSystemPrompt(knowledgeChunks, memories);
  const messages = [
    ...history.map((m) => ({
      role: m.sender === 'assistant' ? 'assistant' : 'user',
      content: m.message,
    })),
    { role: 'user', content: userMessage },
  ];

  const { text, usage } = await getChatCompletion(systemPrompt, messages);

  return {
    reply: text,
    knowledgeChunks,
    usage,
    executionTimeMs: Date.now() - startedAt,
  };
}

module.exports = { handleMessage };
