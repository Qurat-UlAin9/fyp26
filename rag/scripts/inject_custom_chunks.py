"""
inject_custom_chunks.py — idempotent, traceable RAG ingestion.

Usage:
  python inject_custom_chunks.py                        # Runs ALL files in the strategies/ folder
  python inject_custom_chunks.py my_file.json           # Runs ONLY my_file.json
  python inject_custom_chunks.py my_file.json --dry-run # Checks the file, writes nothing

Safety: a chunk's old Supabase row is only deleted AFTER its new vector was
upserted to Pinecone successfully, so a failed run never removes existing rows.
"""

from __future__ import annotations

import glob
import json
import os
import sys
from typing import Any

import requests
from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

from config import EMBEDDING_MODEL_NAME

load_dotenv()

SUPABASE_URL        = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SUPABASE_KEY        = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
PINECONE_KEY        = os.environ.get("PINECONE_API_KEY") or ""
PINECONE_INDEX_NAME = os.environ.get("PINECONE_INDEX_NAME", "adhd-knowledge")
PINECONE_NAMESPACE  = os.environ.get("PINECONE_NAMESPACE", "")

if not (SUPABASE_URL and SUPABASE_KEY and PINECONE_KEY):
    sys.exit("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PINECONE_API_KEY missing")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

PARENT_SOURCE_NAME = "manas_curated_strategies"
PARENT_DOC_TITLE   = "Manas Curated Coping & Behavioral Strategies"

REQUIRED_KEYS = ("id", "category", "trust_score", "text")


def sb(method: str, path: str, *, params=None, json_body=None, prefer=None) -> Any:
    url = f"{SUPABASE_URL}/rest/v1/{path.lstrip('/')}"
    headers = dict(HEADERS)
    if prefer:
        headers["Prefer"] = prefer
    r = requests.request(
        method, url, headers=headers, params=params, json=json_body, timeout=30
    )
    if not r.ok:
        raise RuntimeError(f"Supabase {method} {path} -> {r.status_code}: {r.text[:800]}")
    return r.json() if r.text else None


def get_or_create_source() -> str:
    rows = sb("GET", "knowledge_sources", params={"name": f"eq.{PARENT_SOURCE_NAME}", "select": "id"})
    if rows:
        return rows[0]["id"]
    created = sb(
        "POST", "knowledge_sources",
        json_body={
            "name": PARENT_SOURCE_NAME,
            "source_type": "curated_coaching",
            "trust_score": None,
            "description": "Container for per-chunk sourced coaching strategies.",
        },
        prefer="return=representation",
    )
    return created[0]["id"]


def get_or_create_document(source_id: str) -> str:
    rows = sb("GET", "knowledge_documents", params={"title": f"eq.{PARENT_DOC_TITLE}", "select": "id"})
    if rows:
        return rows[0]["id"]
    created = sb(
        "POST", "knowledge_documents",
        json_body={
            "source_id": source_id,
            "title": PARENT_DOC_TITLE,
            "status": "active",
            "document_type": "text",
        },
        prefer="return=representation",
    )
    return created[0]["id"]


def read_json_file(filepath: str) -> list[dict]:
    """Reads a JSON array file. Also accepts JSON Lines (one object per line)."""
    with open(filepath, "r", encoding="utf-8") as f:
        raw = f.read()
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        return [json.loads(line) for line in raw.splitlines() if line.strip()]


def load_chunks():
    """Loads either all files in the strategies folder, or just the one specified in sys.argv."""
    custom_chunks = []
    strategies_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "strategies")

    # First argument that is not a flag is the file name
    file_args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if file_args:
        target_file = file_args[0]
        filepath = os.path.join(strategies_dir, target_file)
        if not os.path.exists(filepath):
            sys.exit(f"ERROR: File not found {filepath}")
        custom_chunks = read_json_file(filepath)
        print(f"Loaded {len(custom_chunks)} chunks from {target_file}")
    else:
        for filepath in sorted(glob.glob(os.path.join(strategies_dir, "*.json"))):
            custom_chunks.extend(read_json_file(filepath))
        print(f"Loaded {len(custom_chunks)} total chunks from all files in {strategies_dir}")

    return custom_chunks


def clean(d: dict) -> dict:
    """Pinecone rejects null metadata values, so drop None fields."""
    return {k: v for k, v in d.items() if v is not None}


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    print(f"Embedding model: {EMBEDDING_MODEL_NAME}")
    print(f"Pinecone index:  {PINECONE_INDEX_NAME}  namespace={PINECONE_NAMESPACE!r}")
    print(f"Dry run:         {dry_run}")

    CUSTOM_CHUNKS = load_chunks()

    # Check every chunk up front, before anything is written
    seen_ids: set[str] = set()
    problems = []
    for c in CUSTOM_CHUNKS:
        missing = [k for k in REQUIRED_KEYS if c.get(k) in (None, "")]
        if not (c.get("title") or c.get("document_title")):
            missing.append("title")
        if missing:
            problems.append(f"{c.get('id', '?')}: missing {missing}")
        if c.get("id") in seen_ids:
            problems.append(f"{c.get('id')}: duplicate id in this run")
        seen_ids.add(c.get("id"))
    if problems:
        print("\n".join(problems), file=sys.stderr)
        sys.exit("ERROR: fix the problems above. Nothing was written.")

    model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    pc = Pinecone(api_key=PINECONE_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)

    next_index = 0
    doc_id = None

    if dry_run:
        print("[dry-run] Skipping Pinecone and Supabase writes.")
    else:
        source_id = get_or_create_source()
        doc_id = get_or_create_document(source_id)
        print(f"parent source_id={source_id}  document_id={doc_id}")

        # Find the highest existing chunk_index so we don't violate the unique constraint
        max_idx_rows = sb("GET", "knowledge_chunks", params={
            "document_id": f"eq.{doc_id}",
            "select": "chunk_index",
            "order": "chunk_index.desc",
            "limit": 1
        })
        if max_idx_rows:
            next_index = max_idx_rows[0]["chunk_index"] + 1
        print(f"Next available chunk_index starts at: {next_index}")

    results: list[dict] = []
    for chunk in CUSTOM_CHUNKS:
        cid = chunk["id"]
        try:
            text = chunk["text"].strip()
            if not text:
                raise ValueError("empty text")

            title = chunk.get("title") or chunk.get("document_title")

            emb = model.encode(text, normalize_embeddings=True).tolist()
            if len(emb) != 768:
                raise ValueError(f"expected 768-dim embedding, got {len(emb)}")

            metadata = clean({
                "text":            text,
                "category":        chunk["category"],
                "document_title":  title,
                "trust_score":     chunk["trust_score"],
                "source_url":      chunk.get("source_url"),
                "source_citation": chunk.get("source_citation"),
                "ef_dimension":    chunk.get("ef_dimension"),
                "tier":            chunk.get("tier"),
                "batch":           chunk.get("batch"),
            })

            if not dry_run:
                # 1. Pinecone first. If this fails, nothing else is touched.
                index.upsert(
                    vectors=[{"id": cid, "values": emb, "metadata": metadata}],
                    namespace=PINECONE_NAMESPACE,
                )

                # 2. Only now replace this one chunk's Supabase row (if it exists).
                sb("DELETE", "knowledge_chunks", params={
                    "document_id": f"eq.{doc_id}",
                    "external_vector_id": f"eq.{cid}",
                })

                # 3. Insert the new row.
                sb(
                    "POST", "knowledge_chunks",
                    json_body=clean({
                        "document_id":        doc_id,
                        "chunk_index":        next_index,
                        "title":              title,
                        "chunk_type":         chunk["category"],
                        "content":            text,
                        "external_vector_id": cid,
                        "vector_namespace":   PINECONE_NAMESPACE,
                        "embedding_model":    EMBEDDING_MODEL_NAME,
                        "embedding_version":  1,
                        "importance":         5,
                        "source_url":         chunk.get("source_url"),
                        "source_citation":    chunk.get("source_citation"),
                        "trust_score":        chunk["trust_score"],
                    }),
                    prefer="return=minimal",
                )
                next_index += 1

            print(f"[ok]  {cid}  trust={chunk['trust_score']}  cat={chunk['category']}")
            results.append({"id": cid, "status": "ok"})
        except Exception as e:
            print(f"[ERR] {cid}: {e}", file=sys.stderr)
            results.append({"id": cid, "status": "error", "error": str(e)})

    ok  = [r for r in results if r["status"] == "ok"]
    err = [r for r in results if r["status"] == "error"]
    print(f"\n{len(ok)} ok, {len(err)} failed")
    if err:
        print(json.dumps(err, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()