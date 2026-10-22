// backend/services/ai/tools/knowledgeTool.js

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { embedQuery } = require('../rag/embeddings');
const { queryKnowledge } = require('../rag/pineconeClient');

// Tune this against a few known off-topic queries during testing.
const SIMILARITY_THRESHOLD = 0.75;
const TOP_K = 5;

const searchKnowledgeBase = tool(
  async ({ query }, config) => {
    console.log(`\n🔍 [RAG] Searching knowledge base for: "${query}"`);

    try {
      const vector = await embedQuery(query);
      const matches = await queryKnowledge(vector, TOP_K);

      if (!matches || matches.length === 0) {
        console.log(`   ⚠️ [RAG] Pinecone returned 0 matches.`);
        return 'No research found for this query.';
      }

      // Log all matches and whether they passed the threshold
      matches.forEach((m, i) => {
        const title = m.metadata?.document_title || 'Unknown Document';
        const score = m.score ? m.score.toFixed(3) : '0.000';
        const status = parseFloat(score) >= SIMILARITY_THRESHOLD ? '✅ PASS' : '❌ FAIL';
        console.log(`   [${i + 1}] ${status} (score: ${score}) - ${title}`);
      });

      const relevant = matches.filter((m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD);
      console.log(`   -> ${relevant.length} of ${matches.length} chunks passed the ${SIMILARITY_THRESHOLD} threshold.`);

      // Keep the original onRetrieval callback
      if (config?.configurable?.onRetrieval) {
        config.configurable.onRetrieval({ query, allMatches: matches, relevant });
      }

      if (relevant.length === 0) {
        return (
          'No curated research in the knowledge base cleared the relevance threshold for this ' +
          'query. Answer from general knowledge if appropriate, but say plainly that this isn\'t ' +
          'grounded in the app\'s research base, and suggest consulting a professional for anything clinical.'
        );
      }

      return relevant
        .map((m, i) => {
          const md = m.metadata || {};
          return `[${i + 1}] (source: ${md.document_title || 'unknown'}, trust: ${md.trust_score ?? '?'}, similarity: ${m.score.toFixed(2)})\n${md.text || ''}`;
        })
        .join('\n\n');
        
    } catch (error) {
      console.error(`   ❌ [RAG] Search failed:`, error.message);
      return 'Knowledge base search failed due to a technical error.';
    }
  },
  {
    name: 'search_knowledge_base',
    description:
      'Search the curated ADHD/executive-function research knowledge base (clinical guidelines, ' +
      'meta-analyses, consensus statements). Use this for factual/clinical questions -- diagnosis ' +
      'criteria, treatment evidence, exercise-EF research, habit formation science, emotion ' +
      'regulation interventions. Do NOT use for casual conversation or in-app action requests.',
    schema: z.object({
      query: z.string().describe('The specific question or topic to search for'),
    }),
  }
);

module.exports = { searchKnowledgeBase, SIMILARITY_THRESHOLD };