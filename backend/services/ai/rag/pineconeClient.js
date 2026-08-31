//# thin wrapper: query(namespace, vector, topK, filter)
// backend/services/ai/rag/pineconeClient.js
//
// Thin wrapper around the Pinecone Node SDK. Talks to the SAME index
// ('adhd-knowledge') that rag/scripts/embed_and_upsert.py populates.
// Requires: npm install @pinecone-database/pinecone
// Requires env: PINECONE_API_KEY (same key used in rag/.env)

const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_INDEX_NAME = 'adhd-knowledge';

let _client = null;
let _index = null;

function getIndex() {
  if (_index) return _index;

  if (!process.env.PINECONE_API_KEY) {
    throw new Error(
      'PINECONE_API_KEY is not set in the backend environment. ' +
      'Add it to backend/.env (same key as rag/.env).'
    );
  }

  _client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  _index = _client.index(PINECONE_INDEX_NAME);
  return _index;
}

/**
 * Query Pinecone with a pre-computed embedding vector.
 * @param {number[]} vector - 768-dim embedding (must match bge-base-en-v1.5)
 * @param {number} topK
 * @param {object} filter - optional Pinecone metadata filter, e.g. { tier: { $lte: 2 } }
 */
async function queryKnowledge(vector, topK = 5, filter = undefined) {
  const index = getIndex();
  const result = await index.query({
    vector,
    topK,
    includeMetadata: true,
    filter,
  });
  return result.matches || [];
}

module.exports = { queryKnowledge };
