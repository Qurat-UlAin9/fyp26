// Replace your knowledgeTool.js with this
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

const searchKnowledgeBase = tool(
  async ({ query, category }, config) => {
    console.log(`\n🔍 [RAG] Searching: "${query}" | Filter: ${category || 'All'}`);

    try {
      const vector = await embedQuery(query);
      let filter = { source_type: { $ne: 'ai_generated_exemplar' } };
      if (category && category !== 'all') {
        filter = { $and: [filter, { category: { $eq: category } }] };
      }

      const matches = await queryKnowledge(vector, RAW_TOP_K, filter);
      if (!matches || matches.length === 0) return 'No research found for this query.';

      const relevant = matches.filter((m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD);
      if (relevant.length === 0) return 'No highly relevant research or strategies found for this exact query.';

      const papers = relevant.filter((m) => !CUSTOM_SOURCE_TYPES.has(m.metadata?.source_type));
      const custom = relevant.filter((m) => CUSTOM_SOURCE_TYPES.has(m.metadata?.source_type));

      let selPapers = papers.slice(0, PAPER_SLOTS);
      let selCustom = custom.slice(0, CUSTOM_SLOTS);

      if (selPapers.length < PAPER_SLOTS) selCustom = custom.slice(0, CUSTOM_SLOTS + (PAPER_SLOTS - selPapers.length));
      if (selCustom.length < CUSTOM_SLOTS) selPapers = papers.slice(0, PAPER_SLOTS + (CUSTOM_SLOTS - selCustom.length));

      const combined = [...selPapers, ...selCustom].sort((a, b) => b.score - a.score);

      // --- PHASE 1 ADDITION: Capture Chunk IDs ---
      if (config && config.configurable) {
        if (!config.configurable.retrievedChunkIds) config.configurable.retrievedChunkIds = [];
        config.configurable.retrievedChunkIds.push(...combined.map(m => m.id));
      }

      combined.forEach((m, i) => {
        const title = m.metadata?.document_title || 'Unknown Document';
        console.log(`   [${i + 1}] ✅ (${m.score.toFixed(3)}) [${m.metadata?.source_type}] - ${title}`);
      });

      return combined
        .map((m, i) => {
          const md = m.metadata || {};
          const trust = md.trust_score !== undefined ? md.trust_score : 'Unknown';
          const citation = md.source_citation ? `\nCitation: ${md.source_citation}` : '';
          return `[${i + 1}] (Type: ${md.category || 'unknown'}, Trust Score: ${trust}/1.0, Source: ${md.document_title || 'Unknown'})${citation}\nText: ${md.text || ''}`;
        })
        .join('\n\n');
    } catch (error) {
      console.error(`   ❌ [RAG] Search failed:`, error.message);
      return 'Knowledge base search failed.';
    }
  },
  {
    name: 'search_knowledge_base',
    description: 'Search the ADHD knowledge base for research, clinical guidelines, and practical coping strategies.',
    schema: z.object({
      query: z.string().describe('The specific question or topic'),
      category: z.enum(['all', 'coping_strategy', 'behavioral_therapy', 'behavioral_strategy', 'psychology_lens', 'motivation', 'exercise', 'habit_formation', 'emotion_regulation', 'executive_function_interventions', 'diagnosis_treatment_guideline', 'diagnostic_practice_synthesis', 'college_student_consensus', 'misinformation_correction_school_practice']).optional().default('all')
    }),
  }
);

module.exports = { searchKnowledgeBase, SIMILARITY_THRESHOLD };