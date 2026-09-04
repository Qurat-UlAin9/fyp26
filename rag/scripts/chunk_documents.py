"""
STEP 2 — Chunk an extracted .txt file into overlapping chunks with metadata.

Usage:
    python chunk_documents.py peds_20192528

(pass the filename stem — same one used for the .pdf and the .txt)

Reads:  rag/output/extracted/<stem>.txt
Writes: rag/output/chunks/<stem>_chunks.json
"""

import json
import re
import sys

from config import (
    CHUNKS_DIR,
    CHUNK_OVERLAP_WORDS,
    CHUNK_SIZE_WORDS,
    DOCUMENT_REGISTRY,
    EXTRACTED_DIR,
)

PAGE_MARKER_RE = re.compile(r"\[PAGE (\d+)\]")
FOOTER_NOISE_RE = re.compile(
    r"Downloaded from publications\.aap\.org.*?by guest",
    re.IGNORECASE | re.DOTALL,
)


def clean_text(raw: str) -> str:
    """Strip repeated download-footer boilerplate and collapse whitespace."""
    text = FOOTER_NOISE_RE.sub(" ", raw)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_pages(txt_path):
    """Return list of (page_number, page_text) tuples."""
    raw = txt_path.read_text(encoding="utf-8")
    pages = []
    parts = re.split(r"\[PAGE (\d+)\]", raw)
    # parts = ['', '1', text1, '2', text2, ...]
    for i in range(1, len(parts), 2):
        page_num = int(parts[i])
        page_text = parts[i + 1].split(f"[/PAGE {page_num}]")[0]
        pages.append((page_num, clean_text(page_text)))
    return pages


def chunk_words(words, size, overlap):
    """Yield (start_idx, end_idx, chunk_words) sliding windows."""
    step = size - overlap
    i = 0
    n = len(words)
    while i < n:
        window = words[i : i + size]
        if not window:
            break
        yield i, i + len(window), window
        if i + size >= n:
            break
        i += step


def build_chunks(stem: str):
    txt_path = EXTRACTED_DIR / f"{stem}.txt"
    if not txt_path.exists():
        raise FileNotFoundError(
            f"{txt_path} not found — run extract_text.py first."
        )

    doc_meta = DOCUMENT_REGISTRY.get(stem)
    if doc_meta is None:
        print(
            f"WARNING: '{stem}' has no entry in DOCUMENT_REGISTRY (config.py). "
            "Chunks will be created with placeholder metadata — add a real "
            "entry before embedding for accurate trust scoring."
        )
        doc_meta = {
            "title": stem,
            "tier": 4,
            "trust_score": 0.5,
            "category": "unclassified",
            "source_type": "unknown",
            "recommended_tool": None,
        }

    pages = load_pages(txt_path)

    # Flatten to a single word stream but remember which page each word
    # came from, so each chunk can report its page range.
    words_with_pages = []
    for page_num, page_text in pages:
        for w in page_text.split():
            words_with_pages.append((w, page_num))

    all_words = [w for w, _ in words_with_pages]
    chunks = []

    for chunk_index, (start, end, window) in enumerate(
        chunk_words(all_words, CHUNK_SIZE_WORDS, CHUNK_OVERLAP_WORDS)
    ):
        chunk_text = " ".join(window)
        page_range = {p for _, p in words_with_pages[start:end]}
        # Deterministic ID: same stem + same chunk position -> same ID,
        # every time. This makes embed_and_upsert.py idempotent — Pinecone's
        # upsert overwrites a vector with a matching ID instead of adding a
        # duplicate, so re-running the pipeline on the same PDF is always
        # safe. If you ever change CHUNK_SIZE_WORDS/CHUNK_OVERLAP_WORDS,
        # chunk boundaries shift and IDs will regenerate as "new" — that's
        # expected, just re-run embed_and_upsert.py to replace the old set.
        chunk_record = {
            "chunk_id": f"{stem}_chunk_{chunk_index:04d}",
            "source_document": stem,
            "document_title": doc_meta["title"],
            "tier": doc_meta["tier"],
            "trust_score": doc_meta["trust_score"],
            "category": doc_meta["category"],
            "source_type": doc_meta["source_type"],
            "recommended_tool": doc_meta.get("recommended_tool"),
            "page_start": min(page_range),
            "page_end": max(page_range),
            "word_count": len(window),
            "text": chunk_text,
        }
        chunks.append(chunk_record)

    out_path = CHUNKS_DIR / f"{stem}_chunks.json"
    out_path.write_text(json.dumps(chunks, indent=2), encoding="utf-8")
    return out_path, len(chunks)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python chunk_documents.py <filename_stem>")
        print("Example: python chunk_documents.py peds_20192528")
        sys.exit(1)

    stem = sys.argv[1]
    out_path, n_chunks = build_chunks(stem)
    print(f"Wrote {n_chunks} chunks -> {out_path}")
