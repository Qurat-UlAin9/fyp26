"""
STEP 3 (run once, ever) — Create the Pinecone index.

Usage:
    python create_pinecone_index.py

Safe to re-run: it checks whether the index already exists first.
"""

import os

from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

from config import (
    EMBEDDING_DIM,
    PINECONE_CLOUD,
    PINECONE_INDEX_NAME,
    PINECONE_METRIC,
    PINECONE_REGION,
)

load_dotenv()

api_key = os.environ.get("PINECONE_API_KEY")
if not api_key:
    raise RuntimeError(
        "PINECONE_API_KEY not set. Create rag/.env with PINECONE_API_KEY=... "
        "(copy rag/.env.example and fill it in)."
    )

pc = Pinecone(api_key=api_key)

existing = [idx["name"] for idx in pc.list_indexes()]

if PINECONE_INDEX_NAME in existing:
    print(f"Index '{PINECONE_INDEX_NAME}' already exists — nothing to do.")
else:
    pc.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=EMBEDDING_DIM,
        metric=PINECONE_METRIC,
        spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION),
    )
    print(f"Created index '{PINECONE_INDEX_NAME}' (dim={EMBEDDING_DIM}, metric={PINECONE_METRIC}).")
