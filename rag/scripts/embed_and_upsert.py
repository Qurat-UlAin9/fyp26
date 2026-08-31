"""
STEP 4 — Embed chunks with BAAI/bge-base-en-v1.5 (768-dim) and upsert to Pinecone.

Usage:
    python embed_and_upsert.py peds_20192528

Reads:  rag/output/chunks/<stem>_chunks.json
Writes: vectors into the Pinecone index (and re-saves the chunk JSON
        with an `embedded: true` flag so you can tell what's already
        been pushed if you re-run this).
"""

import json
import os
import sys

from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from config import CHUNKS_DIR, EMBEDDING_MODEL_NAME, PINECONE_INDEX_NAME

load_dotenv()

BATCH_SIZE = 32
# Pinecone metadata values must be strings/numbers/bools/lists of strings —
# we keep the full chunk text in metadata since these chunks are small
# (well under Pinecone's 40KB per-vector metadata limit).


def load_chunks(stem: str):
    path = CHUNKS_DIR / f"{stem}_chunks.json"
    if not path.exists():
        raise FileNotFoundError(f"{path} not found — run chunk_documents.py first.")
    return path, json.loads(path.read_text(encoding="utf-8"))


def main(stem: str):
    api_key = os.environ.get("PINECONE_API_KEY")
    if not api_key:
        raise RuntimeError(
            "PINECONE_API_KEY not set. Create rag/.env with PINECONE_API_KEY=... "
        )

    path, chunks = load_chunks(stem)
    print(f"Loaded {len(chunks)} chunks from {path}")

    print(f"Loading embedding model {EMBEDDING_MODEL_NAME} (first run downloads it)...")
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)

    pc = Pinecone(api_key=api_key)
    index = pc.Index(PINECONE_INDEX_NAME)

    texts = [c["text"] for c in chunks]

    # NOTE: no instruction prefix here — BGE only wants the query-side
    # prefix (see config.BGE_QUERY_INSTRUCTION) applied at retrieval time,
    # not on the documents you're indexing.
    print("Embedding chunks...")
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,  # required for cosine similarity to behave correctly
    )

    print("Upserting to Pinecone...")
    vectors = []
    for chunk, emb in zip(chunks, embeddings):
        vectors.append(
            {
                "id": chunk["chunk_id"],
                "values": emb.tolist(),
                "metadata": {
                    "source_document": chunk["source_document"],
                    "document_title": chunk["document_title"],
                    "tier": chunk["tier"],
                    "trust_score": chunk["trust_score"],
                    "category": chunk["category"],
                    "source_type": chunk["source_type"],
                    "page_start": chunk["page_start"],
                    "page_end": chunk["page_end"],
                    "text": chunk["text"],
                },
            }
        )

    for i in tqdm(range(0, len(vectors), BATCH_SIZE)):
        batch = vectors[i : i + BATCH_SIZE]
        index.upsert(vectors=batch)

    for c in chunks:
        c["embedded"] = True
    path.write_text(json.dumps(chunks, indent=2), encoding="utf-8")

    print(f"Done. Upserted {len(vectors)} vectors into '{PINECONE_INDEX_NAME}'.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python embed_and_upsert.py <filename_stem>")
        sys.exit(1)
    main(sys.argv[1])
