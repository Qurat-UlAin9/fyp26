// backend/services/ai/tools/knowledgeTool.js

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { embedQuery } = require('../rag/embeddings');
const { queryKnowledge } = require('../rag/pineconeClient');

const SIMILARITY_THRESHOLD = 0.72;
const RAW_TOP_K = 15;       // pull more candidates than we deliver
const PAPER_SLOTS = 3;      // always reserve for peer-reviewed
const CUSTOM_SLOTS = 2;     // remaining slots for practitioner chunks

// Custom chunk source types (everything else = paper)
const CUSTOM_SOURCE_TYPES = new Set([
  'curated_strategy',
  'psychology_lens',
  'motivation',
  'clinical_framework',
]);

const searchKnowledgeBase = tool(
  async ({ query, category }, config) => {
    console.log(`\n🔍 [RAG] Searching: "${query}" | Filter: ${category || 'All'}`);

    try {
      const vector = await embedQuery(query);

      let filter = {};
      if (category && category !== 'all') {
        filter = { category: { $eq: category } };
      }

      // Pull more candidates so we can enforce the quota
      const matches = await queryKnowledge(vector, RAW_TOP_K, filter);

      if (!matches || matches.length === 0) {
        console.log(`   ⚠️ [RAG] Pinecone returned 0 matches.`);
        return 'No research found for this query.';
      }

      const relevant = matches.filter((m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD);
      if (relevant.length === 0) {
        console.log(`   ⚠️ [RAG] 0 chunks passed threshold ${SIMILARITY_THRESHOLD}`);
        return 'No highly relevant research or strategies found for this exact query.';
      }

      const papers = relevant.filter((m) => !CUSTOM_SOURCE_TYPES.has(m.metadata?.source_type));
      const custom = relevant.filter((m) => CUSTOM_SOURCE_TYPES.has(m.metadata?.source_type));

      let selPapers = papers.slice(0, PAPER_SLOTS);
      let selCustom = custom.slice(0, CUSTOM_SLOTS);

      // Fallback if one bucket is thin
      if (selPapers.length < PAPER_SLOTS) {
        selCustom = custom.slice(0, CUSTOM_SLOTS + (PAPER_SLOTS - selPapers.length));
      }
      if (selCustom.length < CUSTOM_SLOTS) {
        selPapers = papers.slice(0, PAPER_SLOTS + (CUSTOM_SLOTS - selCustom.length));
      }

      const combined = [...selPapers, ...selCustom].sort((a, b) => b.score - a.score);

      combined.forEach((m, i) => {
        const title = m.metadata?.document_title || 'Unknown Document';
        const cat = m.metadata?.category || 'unknown';
        const st = m.metadata?.source_type || 'unknown';
        const trust = m.metadata?.trust_score ? m.metadata.trust_score.toFixed(2) : 'unknown';
        console.log(`   [${i + 1}] ✅ (${m.score.toFixed(3)}) [${cat}|${st}] trust=${trust} - ${title}`);
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
    description:
      'Search the ADHD knowledge base for research, clinical guidelines, and practical coping strategies.\n' +
      'DO NOT filter by category unless the user explicitly asks for a specific type of content (e.g. "give me a clinical guideline" or "just give me exercises").\n' +
      'If you do filter, use:\n' +
      '- "coping_strategy" (practical tips like 2-minute rule)\n' +
      '- "behavioral_therapy" (CBT, behavioral activation)\n' +
      '- "exercise", "habit_formation", "emotion_regulation", "executive_function_interventions" (clinical papers)',
    schema: z.object({
      query: z.string().describe('The specific question or topic'),
      category: z.enum([
        'all',
        'coping_strategy',
        'behavioral_therapy',
        'behavioral_strategy',
        'psychology_lens',
        'motivation',
        'exercise',
        'habit_formation',
        'emotion_regulation',
        'executive_function_interventions',
        'diagnosis_treatment_guideline',
        'diagnostic_practice_synthesis',
        'college_student_consensus',
        'misinformation_correction_school_practice',
      ]).optional().default('all')
        .describe('Optional: The category of knowledge to search. Leave blank to search everything.'),
    }),
  }
);

module.exports = { searchKnowledgeBase, SIMILARITY_THRESHOLD };