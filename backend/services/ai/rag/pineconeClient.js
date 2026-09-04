//# thin wrapper: query(namespace, vector, topK, filter)
// backend/services/ai/rag/pineconeClient.js
//
// Thin wrapper around the Pinecone Node SDK. Talks to the SAME index
// ('adhd-knowledge') that rag/scripts/embed_and_upsert.py populates.
// Requires: npm install @pinecone-database/pinecone
// Requires env: PINECONE_API_KEY (same key used in rag/.env)

const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_INDEX_NAME = 'adhd-knowledge';

// Retry config for transient network failures (e.g. the ConnectTimeoutError
// you just hit). Does NOT retry on real errors like a bad API key or a
// malformed request — only on network-level failures below, since those
// are the only ones a retry can actually fix.
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500; // doubles each retry: 500ms, then 1000ms

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Walk the error.cause chain (Pinecone wraps undici's error inside its own
// PineconeConnectionError) looking for a network-level error code, and
// also fall back to matching known transient-error phrases in the message.
function isTransientError(error) {
  let current = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = current.code;
    if (
      code === 'UND_ERR_CONNECT_TIMEOUT' ||
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNREFUSED'
    ) {
      return true;
    }
    current = current.cause;
  }

  const message = String(error?.message || '');
  return (
    /fetch failed/i.test(message) ||
    /failed to reach pinecone/i.test(message) ||
    /timeout/i.test(message)
  );
}

/**
 * Query Pinecone with a pre-computed embedding vector.
 * Retries up to MAX_RETRIES times on transient network failures before
 * giving up — a single dropped connection no longer kills the whole
 * chat response.
 *
 * @param {number[]} vector - 768-dim embedding (must match bge-base-en-v1.5)
 * @param {number} topK
 * @param {object} filter - optional Pinecone metadata filter, e.g. { tier: { $lte: 2 } }
 */
async function queryKnowledge(vector, topK = 5, filter = undefined) {
  const index = getIndex();

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await index.query({
        vector,
        topK,
        includeMetadata: true,
        filter,
      });
      return result.matches || [];
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === MAX_RETRIES;
      const transient = isTransientError(error);

      if (!transient || isLastAttempt) {
        if (transient && isLastAttempt) {
          console.warn(
            `Pinecone query failed after ${MAX_RETRIES + 1} attempts (transient network error). Giving up.`
          );
        }
        throw error;
      }

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `Pinecone query hit a transient error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms:`,
        error.message
      );
      await sleep(delay);
    }
  }

  // Unreachable in practice, but keeps the function's return type honest.
  throw lastError;
}

module.exports = { queryKnowledge };
