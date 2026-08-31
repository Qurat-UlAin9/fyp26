"""
STEP 5 (sanity check) — Ask a question, see what comes back.

Usage:
    python query_test.py "what medication is recommended first for preschool aged children with ADHD"
"""

import os
import sys

from dotenv import load_dotenv
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer

from config import BGE_QUERY_INSTRUCTION, EMBEDDING_MODEL_NAME, PINECONE_INDEX_NAME

load_dotenv()


def main(question: str, top_k: int = 5):
    api_key = os.environ.get("PINECONE_API_KEY")
    pc = Pinecone(api_key=api_key)
    index = pc.Index(PINECONE_INDEX_NAME)

    model = SentenceTransformer(EMBEDDING_MODEL_NAME)

    # Query-side instruction prefix — this is BGE-specific and matters.
    query_vec = model.encode(
        BGE_QUERY_INSTRUCTION + question,
        normalize_embeddings=True,
    ).tolist()

    results = index.query(vector=query_vec, top_k=top_k, include_metadata=True)

    print(f"\nQuery: {question}\n")
    for i, match in enumerate(results["matches"], start=1):
        md = match["metadata"]
        print(f"--- Result {i} (score={match['score']:.3f}) ---")
        print(f"Source: {md['document_title']} (pages {md['page_start']}-{md['page_end']})")
        print(md["text"][:300] + ("..." if len(md["text"]) > 300 else ""))
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Usage: python query_test.py "your question here"')
        sys.exit(1)
    main(" ".join(sys.argv[1:]))
