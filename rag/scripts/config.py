"""
Central config for the RAG ingestion pipeline.
Every other script imports from here so the chunk size, model name,
and embedding dimension can never drift out of sync between steps.
"""

import os
from pathlib import Path

# ---- paths (relative to project root: fyp26/rag/) ----
RAG_ROOT = Path(__file__).resolve().parent.parent      # fyp26/rag
RAW_DIR = RAG_ROOT / "raw"                              # fyp26/rag/raw
EXTRACTED_DIR = RAG_ROOT / "output" / "extracted"        # plain text per PDF
CHUNKS_DIR = RAG_ROOT / "output" / "chunks"               # chunked JSON per PDF

# ---- embedding model ----
# BAAI/bge-base-en-v1.5 = 768-dim embeddings.
# NOTE: this does NOT match the 384-dim schema documented for
# BAAI/bge-small-en-v1.5 in your Postgres migrations. If you mirror
# chunk metadata into Postgres, your `embeddings` column/pgvector type
# must be vector(768), not vector(384). Either alter that migration or
# keep embeddings Pinecone-only and store just text+metadata in Postgres.
EMBEDDING_MODEL_NAME = "BAAI/bge-base-en-v1.5"
EMBEDDING_DIM = 768

# BGE models want a special instruction prefix on the QUERY side only
# (not on documents at ingest time). Keep this here so your future
# retrieval/query script uses the exact same string.
BGE_QUERY_INSTRUCTION = "Represent this sentence for searching relevant passages: "

# ---- chunking ----
CHUNK_SIZE_WORDS = 300      # ~380-400 tokens for English text, safe under BGE's 512 token limit
CHUNK_OVERLAP_WORDS = 40    # keeps context continuous across chunk boundaries

# ---- pinecone ----
PINECONE_INDEX_NAME = "adhd-knowledge"
PINECONE_METRIC = "cosine"
PINECONE_CLOUD = "aws"
PINECONE_REGION = "us-east-1"   # change if your Pinecone project uses a different region

# ---- source tiering (extend this as you add more papers) ----
# key = filename stem (without .pdf), value = metadata applied to every chunk from that doc
DOCUMENT_REGISTRY = {
    "peds_20192528": {
        "title": "AAP Clinical Practice Guideline for the Diagnosis, Evaluation, "
                  "and Treatment of ADHD in Children and Adolescents",
        "tier": 1,
        "trust_score": 0.95,
        "category": "diagnosis_treatment_guideline",
        "source_type": "clinical_guideline",
    },
    "practice_standards_adhd": {
        "title": "Practice Standards for the Assessment of ADHD: A Synthesis of "
                  "Recommendations From Eight International Guidelines (Skirrow, 2025)",
        "tier": 2,
        "trust_score": 0.85,
        "category": "diagnostic_practice_synthesis",
        "source_type": "guideline_synthesis",
    },
    "ukaan_university_students": {
        "title": "University Students with ADHD: A Consensus Statement from the "
                  "UK Adult ADHD Network (UKAAN) (Sedgwick-Muller et al., 2022)",
        "tier": 2,
        "trust_score": 0.85,
        "category": "college_student_consensus",
        "source_type": "expert_consensus_statement",
    },
    "wfadhd_school_psychologists": {
        "title": "The World Federation of ADHD International Consensus Statement: "
                  "Implications for School Psychologists (Garner & Carlson, NASP Communique, 2023)",
        "tier": 4,
        "trust_score": 0.65,
        "category": "misinformation_correction_school_practice",
        "source_type": "applied_practitioner_commentary",
    },
}

for d in (EXTRACTED_DIR, CHUNKS_DIR):
    d.mkdir(parents=True, exist_ok=True)
