"""
inject_custom_chunks.py — idempotent, traceable RAG ingestion.

Design notes (read before editing):
- Uses DELETE-then-INSERT per document, not ON CONFLICT. Migration 21's
  unique index on (vector_namespace, external_vector_id) is PARTIAL
  (WHERE external_vector_id IS NOT NULL), which Postgres refuses to
  use as an ON CONFLICT target unless the predicate is also supplied —
  and PostgREST's `on_conflict` query param cannot supply a predicate.
- Every chunk carries its own trust_score, source_url and source_citation
  in BOTH Pinecone metadata and Supabase knowledge_chunks.
- Every Supabase call is status-checked.

Env required:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PINECONE_API_KEY
Env optional:
  PINECONE_INDEX_NAME (default 'adhd-knowledge')
  PINECONE_NAMESPACE  (default 'knowledge'; set '' if your retriever
                       queries the default namespace)
"""

from __future__ import annotations

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


# ----------------------------------------------------------------------
# Supabase helper — one code path, always status-checked
# ----------------------------------------------------------------------
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
    rows = sb("GET", "knowledge_sources",
              params={"name": f"eq.{PARENT_SOURCE_NAME}", "select": "id"})
    if rows:
        return rows[0]["id"]
    created = sb(
        "POST", "knowledge_sources",
        json_body={
            "name": PARENT_SOURCE_NAME,
            "source_type": "curated_coaching",
            # NULL at source level — the real signal is per chunk.
            "trust_score": None,
            "description": (
                "Container for per-chunk sourced coaching strategies. "
                "Each chunk carries its own trust_score, source_url, and "
                "source_citation in knowledge_chunks."
            ),
        },
        prefer="return=representation",
    )
    return created[0]["id"]


def get_or_create_document(source_id: str) -> str:
    rows = sb("GET", "knowledge_documents",
              params={"title": f"eq.{PARENT_DOC_TITLE}", "select": "id"})
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


# ----------------------------------------------------------------------
# Chunk data
# ----------------------------------------------------------------------
# Categories (kept aligned with what knowledgeTool.js will filter on):
#   coping_strategy      -> behavioural strategies a user can apply today
#   behavioral_therapy   -> named clinical CBT protocol components
#   behavioral_strategy  -> popular self-help framing (non-clinical)
#
# If your knowledgeTool.js / graph.js currently uses `behavioral_strategy`
# for CBT and Behavioral Activation too, either keep my split (recommended)
# or tell me and I'll reconcile. Do NOT blanket-rename: CBT and Behavioral
# Activation are real protocols from a named RCT — losing that distinction
# in retrieval is a downgrade, not an upgrade.

CUSTOM_CHUNKS = [
    {
        "id": "coping_task_init_01",
        "category": "coping_strategy",
        "title": "Task Initiation: The 2-Minute Rule",
        "text": (
            "When you feel paralyzed to start a task, commit to doing it for just "
            "2 minutes. The hardest part of an ADHD task is the initiation phase "
            "(executive dysfunction). Tell yourself, 'I will only work on this for "
            "120 seconds.' Once you start, the brain's dopamine kicks in and you "
            "often find it easy to keep going past the 2-minute mark."
        ),
        "trust_score": 0.85,
        "source_url": "https://chadd.org/",
        "source_citation": (
            "Task decomposition as a module of Safren's CBT for adult ADHD: "
            "Safren, S. A., Perlman, C. A., Sprich, S., & Otto, M. W. (2017). "
            "Mastering Your Adult ADHD: A Cognitive-Behavioral Treatment "
            "Program (2nd ed.). Oxford University Press."
        ),
    },
    {
        "id": "coping_working_memory_01",
        "category": "coping_strategy",
        "title": "Working Memory: The Launchpad Strategy",
        "text": (
            "Working memory deficits cause us to forget where we put things. "
            "Create a 'launchpad' by the door: a single physical spot where keys, "
            "wallet, and phone must live every day. Do not put them in your pocket "
            "or on the kitchen counter. The ritual of placing them on the "
            "launchpad prevents morning ADHD panic."
        ),
        "trust_score": 0.80,
        "source_url": "https://chadd.org/",
        "source_citation": (
            "Externalized memory / 'home for every object' — widely recommended "
            "in adult ADHD coaching (CHADD; Understood.org). No single named RCT; "
            "standard consequence of working-memory deficits in Barkley's model."
        ),
    },
    {
        "id": "coping_time_blindness_01",
        "category": "coping_strategy",
        "title": "Time Blindness: Visual Timers",
        "text": (
            "ADHD involves 'time blindness' — the inability to sense how much "
            "time has passed, a term and concept described by ADHD researcher "
            "Dr. Russell Barkley. Use analog wall clocks or visual timers (like "
            "a Time Timer) where the red wedge physically disappears. Do not "
            "rely on your internal clock or your phone screen (which is full of "
            "distractions). Make time visible."
        ),
        "trust_score": 0.95,
        "source_url": "https://www.understood.org/en/articles/adhd-time-blindness",
        "source_citation": (
            "Barkley, R. A. (2022). Taking Charge of Adult ADHD: Proven "
            "Strategies to Succeed at Work, at Home, and in Relationships "
            "(2nd ed.). Guilford Press. 'Time blindness' is Barkley's own term."
        ),
    },
    {
        "id": "coping_emotion_01",
        "category": "coping_strategy",
        "title": "Rejection Sensitive Dysphoria: Pausing Before Reacting",
        "text": (
            "Rejection Sensitive Dysphoria (RSD) — a term coined by Dr. William "
            "Dodson, though it is not an official clinical diagnosis — describes "
            "intense emotional pain from perceived criticism. When you feel a "
            "sudden wave of shame or anger, it can help not to act on it "
            "immediately. Step away, breathe, and write down the facts versus "
            "the feelings before responding to anything upsetting (an email, a "
            "text, a comment). Often the perceived rejection is a "
            "misinterpretation of a neutral or ambiguous cue."
        ),
        "trust_score": 0.65,
        "source_url": "https://www.understood.org/en/articles/adhd-and-coping-with-rejection",
        "source_citation": (
            "Dodson, W. (coined 'RSD'). Note: RSD is not an official DSM-5 "
            "diagnosis. 'Pause before responding' is a generic emotion-"
            "regulation coping step; no source names a specific 'rule' "
            "attached to it."
        ),
    },
    {
        "id": "coping_focus_01",
        "category": "coping_strategy",
        "title": "Body Doubling",
        "text": (
            "Body doubling is the practice of working alongside another person "
            "(physically or virtually) to stay focused. Many people with ADHD "
            "report the presence of a low-stakes witness helps them start and "
            "stay on task, though it is worth noting that body doubling is "
            "widely reported anecdotally rather than something with controlled "
            "research behind exactly how or why it works. If you can't find "
            "someone to sit with you, a 'Study with Me' video on YouTube can "
            "simulate the effect for some people."
        ),
        "trust_score": 0.60,
        "source_url": "https://www.understood.org/en/articles/body-doubling-for-adhd-what-it-is-and-how-it-works",
        "source_citation": (
            "Understood.org / CHADD / ADDA all describe body doubling but "
            "explicitly characterise the evidence as anecdotal ('almost no "
            "research'). Treat as widely-reported strategy, not validated "
            "treatment."
        ),
    },
    {
        "id": "coping_distraction_friction_01",
        "category": "coping_strategy",
        "title": "Reducing Distractions: Out of Sight, Out of Mind",
        "text": (
            "Removing the sources of distraction from your environment — and "
            "adding friction to the ones you cannot remove — is a well-"
            "established behavioural technique often called stimulus control. "
            "In ADHD-adapted CBT it is usually framed as 'out of sight, out of "
            "mind': keep your phone in another room while working, log out of "
            "social apps, put snacks on a high shelf, and keep the TV remote "
            "in a drawer. The point is not to 'be disciplined' — it is to "
            "reduce the number of moments where you have to spend willpower "
            "choosing not to get distracted. Willpower is finite; environment "
            "design is not."
        ),
        "trust_score": 0.85,
        "source_url": "https://chadd.org/",
        "source_citation": (
            "Stimulus control as a foundational behavioural principle "
            "(Skinner, B. F., 1953, Science and Human Behavior), applied in "
            "ADHD-adapted CBT (Safren et al., 2010, JAMA 304(8):875-880) "
            "and recommended in Barkley, R. A. (2022), Taking Charge of Adult "
            "ADHD (2nd ed.)."
        ),
    },
    {
        "id": "therapy_cbt_01",
        "category": "behavioral_therapy",
        "title": "Cognitive Restructuring for ADHD-Specific Thoughts",
        "text": (
            "Cognitive restructuring, a core technique in Dr. Steven Safren's "
            "CBT protocol for adult ADHD ('Mastering Your Adult ADHD'), focuses "
            "on changing negative self-talk. When you think 'I am lazy,' reframe "
            "it to 'I have executive dysfunction, and my brain struggles to "
            "initiate.' This is not an excuse; it reflects how ADHD affects the "
            "brain. Changing the narrative from moral failure to neurological "
            "difference can reduce shame and improve task engagement. A 2010 "
            "randomised controlled trial (Safren et al., JAMA) found CBT "
            "combined with medication more effective than medication alone for "
            "adult ADHD symptoms."
        ),
        "trust_score": 0.90,
        "source_url": "https://doi.org/10.1001/jama.2010.1272",
        "source_citation": (
            "Safren, S. A., Sprich, S., Mimiaga, M. J., et al. (2010). "
            "Cognitive behavioral therapy vs relaxation with educational "
            "support for medication-treated adults with ADHD and persistent "
            "symptoms: a randomized controlled trial. JAMA, 304(8), 875-880. "
            "doi:10.1001/jama.2010.1272"
        ),
    },
    {
        "id": "therapy_behavioral_activation_01",
        "category": "behavioral_therapy",
        "title": "Behavioral Activation",
        "text": (
            "ADHD brains often struggle with the 'motivation follows action' "
            "rule — we wait to 'feel like' doing something before we do it. "
            "Behavioral Activation, a component of ADHD-adapted CBT protocols, "
            "teaches the opposite: do the action first, and motivation will "
            "often follow. Start with the smallest possible physical movement "
            "(e.g., just opening the laptop), and let momentum build from there."
        ),
        "trust_score": 0.85,
        "source_url": "https://chadd.org/",
        "source_citation": (
            "Behavioral Activation is a component of ADHD-adapted CBT "
            "protocols (e.g., the CADDI protocol built on Safren et al., "
            "2010, JAMA)."
        ),
    },
    {
        "id": "therapy_habit_stacking_01",
        "category": "behavioral_strategy",   # moved out of 'behavioral_therapy'
        "title": "Habit Stacking",
        "text": (
            "To build a new habit, anchor it to an existing automatic routine. "
            "This technique, popularised as 'Habit Stacking' by James Clear in "
            "Atomic Habits (building on B. J. Fogg's 'Tiny Habits' concept), is "
            "commonly recommended as ADHD-friendly because it does not rely on "
            "remembering a new habit on its own. The formula is: 'After "
            "[CURRENT HABIT], I will [NEW HABIT].' For example: 'After I brush "
            "my teeth, I will take my medication.' Because the existing habit "
            "is already automatic, the new habit piggybacks on that routine "
            "instead of needing its own trigger."
        ),
        "trust_score": 0.70,
        "source_url": "https://jamesclear.com/habit-stacking",
        "source_citation": (
            "Clear, J. (2018). Atomic Habits. Avery. Building on Fogg, B. J. "
            "(2019). Tiny Habits. Popular self-help strategy — not from "
            "CHADD / Safren / Barkley clinical literature."
        ),
    },
]


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main() -> None:
    dry_run = "--dry-run" in sys.argv
    print(f"Embedding model: {EMBEDDING_MODEL_NAME}")
    print(f"Pinecone index:  {PINECONE_INDEX_NAME}  namespace={PINECONE_NAMESPACE!r}")
    print(f"Dry run:         {dry_run}")

    model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    pc = Pinecone(api_key=PINECONE_KEY)
    index = pc.Index(PINECONE_INDEX_NAME)

    if dry_run:
        doc_id = None
        print("[dry-run] Skipping Supabase writes.")
    else:
        source_id = get_or_create_source()
        doc_id = get_or_create_document(source_id)
        print(f"parent source_id={source_id}  document_id={doc_id}")

        # Clean slate for this document ONLY — leaves the 391 linked
        # chunks (which belong to a different document) untouched.
        sb("DELETE", "knowledge_chunks", params={"document_id": f"eq.{doc_id}"})
        print(f"deleted existing chunks under document_id={doc_id}")

    results: list[dict] = []
    for i, chunk in enumerate(CUSTOM_CHUNKS):
        cid = chunk["id"]
        try:
            text = chunk["text"].strip()
            if not text:
                raise ValueError("empty text")

            emb = model.encode(text, normalize_embeddings=True).tolist()
            if len(emb) != 768:
                raise ValueError(f"expected 768-dim embedding, got {len(emb)}")

            metadata = {
                "text":            text,
                "category":        chunk["category"],
                "document_title":  chunk["title"],
                "trust_score":     chunk["trust_score"],
                "source_url":      chunk.get("source_url"),
                "source_citation": chunk.get("source_citation"),
            }

            if not dry_run:
                index.upsert(
                    vectors=[{"id": cid, "values": emb, "metadata": metadata}],
                    namespace=PINECONE_NAMESPACE,
                )

                sb(
                    "POST", "knowledge_chunks",
                    json_body={
                        "document_id":        doc_id,
                        "chunk_index":        i,
                        "title":              chunk["title"],
                        "chunk_type":         chunk["category"],
                        "content":            text,
                        "external_vector_id": cid,
                        "vector_namespace":   PINECONE_NAMESPACE,
                        "embedding_model":    EMBEDDING_MODEL_NAME,
                        "embedding_version":  1,
                        "importance":         5,
                        # New columns from Migration 25:
                        "source_url":         chunk.get("source_url"),
                        "source_citation":    chunk.get("source_citation"),
                        "trust_score":        chunk["trust_score"],
                    },
                    prefer="return=minimal",
                )

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