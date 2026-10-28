// backend/services/ai/tools/knowledgeTool.js

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { embedQuery } = require('../rag/embeddings');
const { queryKnowledge } = require('../rag/pineconeClient');

const SIMILARITY_THRESHOLD = 0.72; 
const TOP_K = 5;

const searchKnowledgeBase = tool(
  async ({ query, category }, config) => {
    console.log(`\n🔍 [RAG] Searching: "${query}" | Filter: ${category || 'All'}`);

    try {
      const vector = await embedQuery(query);
      
      // Build Pinecone metadata filter
      let filter = {};
      if (category && category !== 'all') {
        filter = { category: { $eq: category } };
      }

      const matches = await queryKnowledge(vector, TOP_K, filter);

      if (!matches || matches.length === 0) {
        console.log(`   ⚠️ [RAG] Pinecone returned 0 matches.`);
        return 'No research found for this query.';
      }

      const relevant = matches.filter((m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD);
      
      relevant.forEach((m, i) => {
        const title = m.metadata?.document_title || 'Unknown Document';
        const cat = m.metadata?.category || 'unknown';
        const trust = m.metadata?.trust_score ? m.metadata.trust_score.toFixed(2) : 'unknown';
        console.log(`   [${i + 1}] ✅ PASS (score: ${m.score.toFixed(3)}) [${cat}] (Trust: ${trust}) - ${title}`);
      });

      if (relevant.length === 0) {
        return 'No highly relevant research or strategies found for this exact query.';
      }

      // FIXED: Now passing Trust Score, Citation, and Category so the AI knows what it is reading
      return relevant
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
        'exercise', 
        'habit_formation', 
        'emotion_regulation', 
        'executive_function_interventions', 
        'diagnosis_treatment_guideline',
        'diagnostic_practice_synthesis',
        'college_student_consensus',
        'misinformation_correction_school_practice'
      ]).optional().default('all')
        .describe('Optional: The category of knowledge to search. Leave blank to search everything.'),
    }),
  }
);

module.exports = { searchKnowledgeBase, SIMILARITY_THRESHOLD };