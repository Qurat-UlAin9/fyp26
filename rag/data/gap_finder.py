"""
RAG gap finder for Project Manas.

Samples cleaned Reddit seeds, runs each through your Pinecone retrieval,
logs similarity scores, flags weak retrievals, and clusters the weak ones
so you know which chunks to write first.

Install:  pip install pandas sentence-transformers pinecone scikit-learn
Env vars: PINECONE_API_KEY
Run:      python gap_finder.py
"""
import os
import pandas as pd
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from sklearn.cluster import KMeans

# ------------------------- EDIT THESE -------------------------
CSV_PATH      = "YES_TRUE_FINAL_v2.csv"
TEXT_COL      = "text"        # column with the cleaned first-person message
CATEGORY_COL  = "category"    # column with the EF dimension (8 categories)
INDEX_NAME    = "your-index-name"
NAMESPACE     = ""            # "" if you don't use namespaces
CHUNK_TEXT_FIELD = "text"     # metadata field holding the chunk text
CHUNK_CAT_FIELD  = "category" # metadata field holding the chunk category
PER_CATEGORY  = 25            # 8 categories x 25 = 200 queries
TOP_K         = 5
WEAK_PERCENTILE = 25          # bottom 25% of top-1 scores = "weak"
N_CLUSTERS    = 10
SEED          = 42
# --------------------------------------------------------------

BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

df = pd.read_csv(CSV_PATH)
df = df.dropna(subset=[TEXT_COL, CATEGORY_COL])

# 1. Balanced sample across categories
sample = (
    df.groupby(CATEGORY_COL, group_keys=False)
      .apply(lambda g: g.sample(min(len(g), PER_CATEGORY), random_state=SEED))
      .reset_index(drop=True)
)
print(f"Sampled {len(sample)} seeds across {sample[CATEGORY_COL].nunique()} categories")

# 2. Embed queries (same model + prefix as your app)
model = SentenceTransformer("BAAI/bge-base-en-v1.5")
queries = sample[TEXT_COL].tolist()
q_emb = model.encode(
    [BGE_QUERY_PREFIX + q for q in queries],
    normalize_embeddings=True,
    show_progress_bar=True,
)

# 3. Retrieve and log
pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index = pc.Index(INDEX_NAME)

rows = []
for q, cat, emb in zip(queries, sample[CATEGORY_COL], q_emb):
    res = index.query(
        vector=emb.tolist(), top_k=TOP_K,
        include_metadata=True, namespace=NAMESPACE,
    )
    matches = res["matches"]
    top = matches[0] if matches else None
    md = (top["metadata"] if top else {}) or {}
    rows.append({
        "query": q,
        "query_category": cat,
        "top1_score": top["score"] if top else 0.0,
        "top3_mean": sum(m["score"] for m in matches[:3]) / max(1, len(matches[:3])),
        "top1_chunk_category": md.get(CHUNK_CAT_FIELD, ""),
        "top1_trust": md.get("trust_score", ""),
        "top1_chunk_preview": str(md.get(CHUNK_TEXT_FIELD, ""))[:200],
    })

res_df = pd.DataFrame(rows)

# 4. Flag gaps. Use a percentile, not a fixed number: bge scores bunch up
#    (roughly 0.5-0.8), so absolute cutoffs mislead.
cutoff = res_df["top1_score"].quantile(WEAK_PERCENTILE / 100)
res_df["weak_score"] = res_df["top1_score"] <= cutoff

# Also flag when the best chunk is a clinical paper (abstract-style) rather
# than a practical strategy. Adjust this list to your actual category names.
PAPER_CATS = {
    "exercise", "habit_formation", "emotion_regulation",
    "executive_function_interventions", "diagnosis_treatment_guideline",
    "diagnostic_practice_synthesis", "college_student_consensus",
}
res_df["paper_only"] = res_df["top1_chunk_category"].isin(PAPER_CATS)
res_df["gap"] = res_df["weak_score"] | res_df["paper_only"]

# 5. Cluster the gap queries so you can write one chunk per cluster
gaps = res_df[res_df["gap"]].copy()
if len(gaps) >= N_CLUSTERS:
    g_emb = model.encode(gaps["query"].tolist(), normalize_embeddings=True)
    km = KMeans(n_clusters=N_CLUSTERS, random_state=SEED, n_init=10).fit(g_emb)
    gaps["cluster"] = km.labels_
    # example query closest to each cluster centre
    for c in range(N_CLUSTERS):
        idx = gaps.index[gaps["cluster"] == c]
        dists = ((g_emb[[gaps.index.get_loc(i) for i in idx]] - km.cluster_centers_[c]) ** 2).sum(1)
        gaps.loc[idx, "cluster_example"] = gaps.loc[idx[dists.argmin()], "query"]
else:
    gaps["cluster"] = 0
    gaps["cluster_example"] = ""

res_df.to_csv("retrieval_log.csv", index=False)
gaps.sort_values("cluster").to_csv("gap_queries.csv", index=False)

# 6. Summary
print("\n=== Top-1 score by category (lower = weaker coverage) ===")
print(res_df.groupby("query_category")["top1_score"].agg(["mean", "min"]).round(3))
print(f"\nWeak-score cutoff (p{WEAK_PERCENTILE}): {cutoff:.3f}")
print(f"Gap queries: {len(gaps)} / {len(res_df)}")
print("\n=== Biggest gap clusters ===")
summary = (
    gaps.groupby("cluster")
        .agg(size=("query", "size"), example=("cluster_example", "first"))
        .sort_values("size", ascending=False)
)
for c, r in summary.iterrows():
    print(f"[cluster {c}] n={r['size']}  e.g. {str(r['example'])[:140]}")
print("\nWrote retrieval_log.csv and gap_queries.csv")