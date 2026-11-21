// backend/services/ai/tools/knowledgeTool.js
//
// Two ways to reach the knowledge base:
//  1. retrieveKnowledge()  - plain function. The agent calls it BEFORE the model
//     answers (see context/knowledgeContext.js), so grounded facts are always in
//     the prompt and do not depend on the model deciding to search.
//  2. search_knowledge_base - the tool, for follow-up searches mid-conversation.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { embedQuery } = require('../rag/embeddings');
const { queryKnowledge } = require('../rag/pineconeClient');

const SIMILARITY_THRESHOLD = 0.72;
const RAW_TOP_K = 15;
const PAPER_SLOTS = 3;
const CUSTOM_SLOTS = 2;

const CUSTOM_SOURCE_TYPES = new Set([
  'curated_strategy', 'psychology_lens', 'motivation', 'clinical_framework'
]);

const CATEGORIES = ['all', 'coping_strategy', 'behavioral_therapy', 'behavioral_strategy', 'psychology_lens', 'motivation', 'exercise', 'habit_formation', 'emotion_regulation', 'executive_function_interventions', 'diagnosis_treatment_guideline', 'diagnostic_practice_synthesis', 'college_student_consensus', 'misinformation_correction_school_practice'];

/**
 * Search Pinecone and pick a balanced set of research papers + curated strategies.
 * @returns {Promise<{items: Array, reason: string|null}>}
 *   items: [{ id, score, title, category, sourceType, trust, citation, text }]
 */
async function retrieveKnowledge(query, category = 'all', opts = {}) {
  const threshold = typeof opts.minScore === 'number' ? opts.minScore : SIMILARITY_THRESHOLD;
  const vector = await embedQuery(query);
  let filter = { source_type: { $ne: 'ai_generated_exemplar' } };
  if (category && category !== 'all') {
    filter = { $and: [filter, { category: { $eq: category } }] };
  }

  const matches = await queryKnowledge(vector, RAW_TOP_K, filter);
  if (!matches || matches.length === 0) return { items: [], reason: 'No research found for this query.', topScores: [] };
  const topScores = matches.slice(0, 3).map((m) => Number((m.score ?? 0).toFixed(3)));

  const relevant = matches.filter((m) => (m.score ?? 0) >= threshold);
  if (relevant.length === 0) return { items: [], reason: 'No highly relevant research or strategies found for this exact query.', topScores };

  const papers = relevant.filter((m) => !CUSTOM_SOURCE_TYPES.has(m.metadata?.source_type));
  const custom = relevant.filter((m) => CUSTOM_SOURCE_TYPES.has(m.metadata?.source_type));

  let selPapers = papers.slice(0, PAPER_SLOTS);
  let selCustom = custom.slice(0, CUSTOM_SLOTS);
  if (selPapers.length < PAPER_SLOTS) selCustom = custom.slice(0, CUSTOM_SLOTS + (PAPER_SLOTS - selPapers.length));
  if (selCustom.length < CUSTOM_SLOTS) selPapers = papers.slice(0, PAPER_SLOTS + (CUSTOM_SLOTS - selCustom.length));

  const combined = [...selPapers, ...selCustom].sort((a, b) => b.score - a.score);

  const items = combined.map((m) => {
    const md = m.metadata || {};
    return {
      id: m.id,
      score: m.score,
      title: md.document_title || 'Unknown Document',
      category: md.category || 'unknown',
      sourceType: md.source_type || 'unknown',
      trust: md.trust_score !== undefined ? md.trust_score : 'Unknown',
      citation: md.source_citation || '',
      text: md.text || '',
    };
  });
  return { items, reason: null, topScores };
}

const searchKnowledgeBase = tool(
  async ({ query, category }, config) => {
    console.log(`\n🔍 [RAG tool] Searching: "${query}" | Filter: ${category || 'All'}`);
    try {
      const { items, reason } = await retrieveKnowledge(query, category);
      if (items.length === 0) return reason;

      if (config && config.configurable) {
        if (!config.configurable.retrievedChunkIds) config.configurable.retrievedChunkIds = [];
        config.configurable.retrievedChunkIds.push(...items.map((m) => m.id));
      }
      items.forEach((m, i) => console.log(`   [${i + 1}] ✅ (${m.score.toFixed(3)}) [${m.sourceType}] - ${m.title}`));

      return items
        .map((m, i) => `[${i + 1}] (Type: ${m.category}, Trust Score: ${m.trust}/1.0, Source: ${m.title})${m.citation ? `\nCitation: ${m.citation}` : ''}\nText: ${m.text}`)
        .join('\n\n');
    } catch (error) {
      console.error(`   ❌ [RAG] Search failed:`, error.message);
      return 'Knowledge base search failed.';
    }
  },
  {
    name: 'search_knowledge_base',
    description:
      'Search the knowledge base (research, clinical guidelines, practical and psychological strategies) for MORE detail. ' +
      'Relevant knowledge for the current message is already in your context; call this only when the user digs deeper into a different aspect.',
    schema: z.object({
      query: z.string().describe('The specific question or topic'),
      category: z.enum(CATEGORIES).optional().default('all'),
    }),
  }
);

module.exports = { searchKnowledgeBase, retrieveKnowledge, SIMILARITY_THRESHOLD };
