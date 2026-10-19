"""
STEP 5 — Link existing chunk JSON files to Supabase.

Context:
    Migration 21 dropped the pgvector `embedding` column and switched
    to an external-vector architecture. Pinecone has the vectors, but
    Supabase `knowledge_chunks` is empty — so retrieval (Pinecone ID →
    Supabase row lookup) returns nothing.

    This script reads every chunk JSON file in rag/output/chunks/,
    creates the matching rows in Supabase, and links each row to its
    existing Pinecone vector via `external_vector_id`.

    Pinecone is NOT touched. No re-embedding. Idempotent — safe to
    re-run any time.

Usage:
    cd C:\\dev\\fyp26\\rag\\scripts
    ..\\.venv\\Scripts\\activate
    python link_chunks_to_supabase.py
"""

import json
import os
import sys

import requests
from dotenv import load_dotenv

from config import CHUNKS_DIR, DOCUMENT_REGISTRY

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in rag/.env"
    )

BASE = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}

VECTOR_NAMESPACE = "knowledge"


def _get_first(table, filters):
    params = {"select": "id"}
    for k, v in filters.items():
        params[k] = f"eq.{v}"
    r = requests.get(f"{BASE}/{table}", headers=HEADERS, params=params)
    r.raise_for_status()
    rows = r.json()
    return rows[0]["id"] if rows else None


def upsert_source(stem, meta):
    existing = _get_first("knowledge_sources", {"name": stem})
    if existing:
        return existing

    payload = {
        "name": stem,
        "description": meta["title"][:500],
        "source_type": meta.get("source_type", "unknown"),
        "trust_score": float(meta.get("trust_score", 0.75)),
        "active": True,
        "priority": int(meta.get("tier", 3)),
    }
    r = requests.post(
        f"{BASE}/knowledge_sources",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=payload,
    )
    if not r.ok:
        print(f"  SOURCE INSERT FAILED: {r.status_code} {r.text[:400]}")
        sys.exit(1)
    return r.json()[0]["id"]


def upsert_document(stem, source_id, meta):
    existing = _get_first("knowledge_documents", {"title": meta["title"]})
    if existing:
        return existing

    payload = {
        "source_id": source_id,
        "title": meta["title"],
        "language": "en",
        "status": "active",
        "document_type": "pdf",
    }
    r = requests.post(
        f"{BASE}/knowledge_documents",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=payload,
    )
    if not r.ok:
        print(f"  DOCUMENT INSERT FAILED: {r.status_code} {r.text[:400]}")
        sys.exit(1)
    return r.json()[0]["id"]


def upsert_chunk_batch(batch, document_id):
    payload = []
    for c in batch:
        payload.append({
            "document_id": document_id,
            "chunk_index": c["chunk_index"],
            "title": c.get("document_title"),
            "chunk_type": c.get("category", "general"),
            "content": c["text"],
            "token_count": max(1, c.get("word_count", 0) * 4 // 3),
            "importance": 3,
            "recommended_tool": c.get("recommended_tool") or None,
            "language": "en",
            "embedding_model": "BAAI/bge-base-en-v1.5",
            "embedding_version": 1,
            "external_vector_id": c["chunk_id"],
            "vector_namespace": VECTOR_NAMESPACE,
            "metadata": {
                "tier": c.get("tier"),
                "trust_score": c.get("trust_score"),
                "page_start": c.get("page_start"),
                "page_end": c.get("page_end"),
                "source_type": c.get("source_type"),
                "source_document": c.get("source_document"),
                "document_title": c.get("document_title"),
                "category": c.get("category"),
            },
        })

    r = requests.post(
        f"{BASE}/knowledge_chunks",
        headers={
            **HEADERS,
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        params={"on_conflict": "vector_namespace,external_vector_id"},
        json=payload,
    )
    if not r.ok:
        print(f"  CHUNK UPSERT FAILED: {r.status_code}")
        print(f"  {r.text[:800]}")
        sys.exit(1)


def main():
    files = sorted(CHUNKS_DIR.glob("*_chunks.json"))
    if not files:
        print(f"No *_chunks.json files found in {CHUNKS_DIR}")
        sys.exit(1)

    print(f"Found {len(files)} chunk file(s) in {CHUNKS_DIR}\n")

    total = 0

    for path in files:
        stem = path.stem.replace("_chunks", "")
        meta = DOCUMENT_REGISTRY.get(stem)

        if not meta:
            print(f"[SKIP] {stem} — no DOCUMENT_REGISTRY entry")
            continue

        chunks = json.loads(path.read_text(encoding="utf-8"))
        if not chunks:
            print(f"[SKIP] {stem} — 0 chunks in file")
            continue

        for i, c in enumerate(chunks):
            c.setdefault("chunk_index", i)

        print(f"[{stem}] {len(chunks)} chunks")

        source_id = upsert_source(stem, meta)
        document_id = upsert_document(stem, source_id, meta)

        for i in range(0, len(chunks), 50):
            batch = chunks[i:i + 50]
            upsert_chunk_batch(batch, document_id)
            print(f"  upserted {i + len(batch)}/{len(chunks)}")

        total += len(chunks)

    print(f"\nDone. {total} chunks linked to Supabase.")


if __name__ == "__main__":
    main()