//# BGE embedding calls (mirrors your rag/ pipeline's model+prefix)
// backend/services/ai/rag/embeddings.js
//
// Node has no good native BGE embedding option, and re-implementing the
// model in JS would let query-time and ingest-time embeddings drift apart.
// Instead this calls your existing Python service (backend/app.py, which
// already loads models for adhd_model.pkl) at a new /embed route.
//
// Add the matching Flask route to backend/app.py (snippet provided
// separately) — it loads BAAI/bge-base-en-v1.5 ONCE at startup and reuses
// it, so this call is fast (no per-request model load).
//
// Env: PYTHON_SERVICE_URL, e.g. http://localhost:8000 (adjust to your
// actual app.py port from Procfile/config)

const PYTHON_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// BGE wants this instruction prefix on the QUERY side only — must match
// BGE_QUERY_INSTRUCTION in rag/scripts/config.py exactly.
const BGE_QUERY_INSTRUCTION =
  'Represent this sentence for searching relevant passages: ';

async function embedQuery(text) {
  const res = await fetch(`${PYTHON_SERVICE_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: BGE_QUERY_INSTRUCTION + text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Embedding service failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!Array.isArray(data.embedding)) {
    throw new Error('Embedding service returned an unexpected shape.');
  }
  return data.embedding;
}

module.exports = { embedQuery };
