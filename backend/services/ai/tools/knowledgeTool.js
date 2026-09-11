// backend/services/ai/tools/knowledgeTool.js
//
// Implements the similarity-threshold fix flagged earlier: instead of
// always forcing 5 chunks into context regardless of relevance, this tool
// only returns chunks that clear a cosine-similarity cutoff, and tells the
// model plainly when nothing relevant was found. This also converts your
// RAG retrieval from "always-injected context" into an on-demand tool call
// -- the model decides when a question actually needs your research corpus.
//
// ASSUMPTION: embedQuery() and queryKnowledge() keep their existing
// signatures from rag/embeddings.js and rag/pineconeClient.js. If
// pineconeClient.js already has retry-with-backoff (per your handoff doc),
// that's preserved since we're calling the same function, not reimplementing it.

const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { embedQuery } = require('../rag/embeddings');
const { queryKnowledge } = require('../rag/pineconeClient');

// Tune this against a few known off-topic queries during testing.
// BGE + cosine typically needs ~0.75-0.8 to mean "actually relevant."
const SIMILARITY_THRESHOLD = 0.75;
const TOP_K = 5;

const searchKnowledgeBase = tool(
  async ({ query }, config) => {
    const vector = await embedQuery(query);
    const matches = await queryKnowledge(vector, TOP_K);

    const relevant = (matches || []).filter((m) => (m.score ?? 0) >= SIMILARITY_THRESHOLD);

    // Surface what got retrieved (and whether it cleared the bar) to the
    // caller via config, so agent.js/graph.js can still log full retrieval
    // detail to tool_execution_logs even when nothing qualified.
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
