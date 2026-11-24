// # get/set user_memories, embed + upsert to Pinecone
/*
## Plan for this turn — no reranker, just the three fixes that don't need new infra

You deferred reranker. Smart — that means the next eval measures *only* the three cheap fixes, so you get clean attribution. If those fix the regression, you skip reranker entirely. If they don't, reranker is justified.

### Files to change — exactly three edits

**Edit 1: `knowledgeTool.js`** — use the **Tweak 3 version from two messages back** (the one with `RAW_TOP_K = 15`, source-type buckets, 3-paper + 2-custom quota, `SIMILARITY_THRESHOLD = 0.72`).

**Do NOT use** the reranker version I gave later — that has `SIMILARITY_THRESHOLD = 0.55` and `rerank()` import. That's for later.

**Edit 2: `graph.js` — `# FORMATTING` block** — replace with:

```
# FORMATTING
- For factual or clinical claims, base your answer on what the knowledge base returned, but write it in your own words — do not paste chunks verbatim.
- Retrieved chunks contain labeled sections such as "Recognize it when:", "How:", "Why it helps:", "Try saying:", and "If it does not work:". These are internal scaffolding for your reasoning, NOT output templates. NEVER reproduce these labels in your reply, and do not copy sentences word-for-word. Adapt the content into warm, natural conversational prose.
- When a chunk offers a "Try saying:" line, you may suggest it to the user (e.g., "You could try saying: ..."), but paraphrase it into their situation rather than quoting it as a script.
- Do not output source markers like "[1]" or "(Source: ...)" unless the user explicitly asks where the information came from. Speak as one assistant, not as a research report.
- Use Markdown formatting (bold, bullets).
- Do not narrate that you are using a tool.
```

**Edit 3: `graph.js` — `# TOOLS & KNOWLEDGE BASE` block** — replace with the version I gave in my last message (the one with "ALWAYS leave category as all", the 13-category list, the trust-score tiers, and the "never filter just because it's practical" rule).

### Then:

1. Restart Node
2. Smoke test — 5 queries, check console logs. Look for the `[category|source_type] t=X.XX` split in the output. You should see roughly 3 papers + 2 custom per query, with both `coping_strategy` and `behavioral_strategy` chunks appearing (not just one).
3. **Save the current eval results as `eval_before_fixes.txt`** (or whatever filename)
4. Re-run the same eval — same queries, same judge prompt, same criteria
5. Save as `eval_after_fixes.txt`

**Do not change the eval methodology between runs.** Same test set, same judge, same prompts, same rating scale. Attribution requires identical conditions.

---

## What success looks like in the next eval

Compare `eval_after_fixes` vs the current RAG-after numbers:

| Metric | Current RAG-after | Target after fixes |
|---|---|---|
| Tone | 4.85 (was 4.96 in RAG-before) | **≥ 4.92** — the FORMATTING fix is aimed exactly here |
| Grounding | 4.75 (was 4.85 in RAG-before) | **≥ 4.85** — the 3-paper quota is aimed exactly here |
| Specificity | 4.75 (was 4.88 in RAG-before) | **≥ 4.85** — category fix should help since more chunks are reachable |
| Overall | 4.85 (was 4.90 in RAG-before) | **≥ 4.90** — this is the win condition |
| Technique mention rate | 45.8% | **≥ 55%** — category fix should surface more `behavioral_strategy` chunks |
| added_chunks_in_top5_rate | 95.8% | Should stay ~0.95 — no regression |

**RAG-after > RAG-before on overall** is the single number that matters. If that crosses, you've fixed the regression with zero new infrastructure. If tone is ≥ 4.92 and grounding ≥ 4.85, individual criteria are also clean.

---

## What happens based on the result

**If RAG-after ≥ RAG-before on overall:**  
→ Fixes worked. Move to **Step 3 in the roadmap**: fill corpus gaps before adding the learning strategies.

**If RAG-after still < RAG-before:**  
→ Retrieval quality is the real bottleneck, not the prompt or quota. *Then* install reranker (Tweak 2). The 3-fix path was worth trying first because it's free; if it doesn't clear the bar, reranker is justified.

**If tone specifically doesn't recover:**  
→ The FORMATTING block wording needs another iteration. Possible causes: (a) the LLM is mimicking chunk format because it's shorter than your instructions and closer to the retrieved text, (b) system prompt length is diluting the FORMATTING rule. Fix would be: move FORMATTING earlier in the system prompt, or strengthen with "This is a hard rule — any 'Try saying:' or 'Recognize it when:' output is a failure."

---

## What comes after the eval, in order

Assuming the fixes land, the priority queue for RAG is:

**A. Fill the two empty gaps (highest impact, ~2 hrs of writing)**
- **MonitoringResponsibilities** — 0 chunks, 235 queries across "forgotten deadlines" (134) and "forgotten commitments" (94). This is a whole EF dimension with zero coverage. Add 5–7 chunks: calendar/planner systems, alarm staging, "did I actually do it" rituals, commitment-tracking, breaking the "I'll remember" trap.
- **EmotionRegulation mood** — you have ~2 anger-focused chunks; queries show 194 mood-swing + 101 emotional-overwhelm. Add 5–6 mood-specific chunks: mood tracking, name-the-feeling-early, environment-shift, "is this depression or a bad day", sensory reset.

These two gaps explain why RAG-after doesn't beat RAG-before on those categories in Table 4. Filling them is the direct fix.

**B. Crisis handling (separate from RAG, ~1–2 hrs)**
Pre-LLM keyword/classifier → hotline UI. Do NOT put crisis content in Pinecone. This is the "⛔ Runtime crisis-detection layer" from your handoff, and it's a defense question waiting to happen.

**C. The 3 learning strategies — start with Prompt Evolution**
Easiest of the three, most defensible, and doesn't depend on feedback sparsity. Build the `prompt_versions` table, A/B infrastructure, and offline rater (you + supervisor). 50 examples per arm.

**D. Backfill papers' `source_url` / `source_citation` in Supabase**
Migration 25 added the columns; papers predate them. Write a small script to UPDATE from the existing paper metadata (they're in `config.py`'s `DOCUMENT_REGISTRY`). ~30 min, low priority since Pinecone has trust_score so retrieval works.

**E. Few-Shot Exemplar Bank (Strategy 2)**
Depends on (1) having good exemplars — seed synthetically, and (2) having `source_type: 'ai_generated_exemplar'` + `trust_score: 0.3–0.5` separation in place. Do this after A–D.

**F. RAG Self-Expansion (Strategy 1)**
Last. Depends on Strategy 2's storage being in place, and on trust_score filtering being enforced (never let AI-generated chunks mix into the peer-reviewed pool).

---

## Right now — just do the 3 edits

Apply Edits 1–3, restart, smoke test, save the current eval, re-run.

Send me:
1. The 5 smoke-test console logs (I want to see the `[category|source_type] t=X.XX` lines to confirm the quota is working)
2. The re-eval tables
3. Whether tone recovered specifically (this tells me if the FORMATTING fix worked or needs iteration)

Then we decide: reranker, or straight to gap-filling.
























## Direct answer on app explainers

**Don't put them in RAG as vectors.** Three reasons:

1. **Same contamination problem as AI-generated chunks** — if "the moods tab tracks how you feel" sits in the same index as "AAP guidelines say stimulants are first-line", a query like "how do I track my mood" could retrieve *both* and the LLM might mix them. You'd need a `source_type: 'app_docs'` filter, which means the retrieval layer gets one more special case for zero benefit.
2. **App docs are tiny and finite** — you have maybe 10–30 explainers (moods, habits, focus timer, reports, how reminders work, why the AI asks about your day, etc.). That's a **static block**, not a search problem. RAG is for open-ended content.
3. **Different retrieval intent** — clinical queries need semantic search; "how does X feature work" needs exact-keyword match. Mixing them means you're forcing one retrieval method to do two jobs badly.

**What to do instead:** add a **tool** called `explain_app_feature(feature_name)`. It's a plain function that returns canned text for the matched feature. Lives at Layer 4 (Tool). No embeddings, no Pinecone, no namespace.

```js
// backend/services/ai/tools/appHelpTool.js
const APP_HELP = {
  moods: 'The Moods card on Home lets you log how you feel...',
  habits: 'The Habits tab tracks daily routines...',
  focus_timer: 'The Focus timer runs a 25-minute block...',
  reports: 'Reports shows your mood trends, task completion...',
  // ...10-20 entries
};

const explainAppFeature = tool(async ({ feature }) => {
  const key = feature.toLowerCase().replace(/\s+/g, '_');
  return APP_HELP[key] || 'I don't have an explainer for that feature yet.';
}, {
  name: 'explain_app_feature',
  description: 'Use when the user asks how a Manas app feature works (habits tab, moods, focus timer, reports, reminders). Do NOT use for ADHD questions.',
  schema: z.object({ feature: z.string() })
});
```

Register it in `graph.js` alongside the other tools. **2 hours of work, not 2 days.** Do it at Phase 5.

---

## Priority — you're right, 3 techniques first

Your order is correct. Here's the full sequence with dependency logic:

### Phase 0 — Clear blockers (today)
Before writing a single new feature:
1. **Confirm `python app.py` starts and `/embed` returns an array** — you haven't verified this yet
2. **Fix login** — is it working after clearing site data?
3. **Apply the 3 RAG edits** — `knowledgeTool.js` + `graph.js` (two blocks). Queued for a while. Get them out of the way
4. **Re-run the eval** — establish whether Tweak 3 + 5 recovered tone and grounding. **Without this number, you can't measure whether the 3 strategies improve anything.** This is your baseline.

Skip Phase 0 and you'll build 3 learning strategies on top of an unmeasured system. Every later number will be meaningless.

### Phase 1 — Feedback capture (Bucket A) — 1 day
Everything downstream depends on this.
- `migrations/26_feedback_events.sql`
- `backend/routes/feedback.js`
- 👍/👎 buttons in `MessageBubble.js` — **this IS the frontend feedback infra you mentioned**
- `chat_messages.retrieved_chunk_ids` + `prompt_version_id` columns
- Wire `knowledgeTool.js` to return chunk IDs

This is the answer to your "I need to add feedback infrastructure to frontend" — it's step 1, not a later phase. You can't skip it.

### Phase 2 — Strategy 3: Prompt Evolution — 1-2 days
Cheapest, most defensible, pure DB + prompt swap. No embeddings. No Pinecone.
- `migrations/27_prompt_versions.sql`
- `promptService.js` (get active prompt for user, cache 5 min)
- Wire into `buildSystemPrompt()`
- Admin endpoint `POST /api/prompts/activate/:id`
- `prompt_ab_eval.py` — offline A/B with your internal raters

**Why first:** doesn't depend on any real user feedback, works from day 1, and "we ran A/B tests on prompt versions and picked the winner" is a strong defense line.

### Phase 3 — Strategy 2: Few-Shot Exemplar Bank — 2-3 days
- `migrations/28_exemplar_bank.sql`
- `exemplarRetrieval.js` + separate Pinecone namespace `exemplars`
- `seed_exemplars.py` — synthetic seeds (5-10 per EF category) using teacher model
- Wire into `buildSystemPrompt()`
- `promoteToBank.js` — real 👍 promotes to bank

**Why second:** seed synthetically so it's demoable day 1. Real feedback improves it over time but isn't blocking.

### Phase 4 — Strategy 1: RAG Content Self-Expansion — 1-2 days
- `migrations/29_ai_generated_chunks.sql`
- `promotionService.js` — 👍 promotes answer to Pinecone with `source_type: 'ai_generated_exemplar'`, `trust_score: 0.4`
- **`knowledgeTool.js` filter: exclude `ai_generated_exemplar` from evidence retrieval** — this is the safety guarantee you can defend
- Separate retrieval path for exemplars, OR just use exemplar bank from Phase 3 (cleaner)

**Why last:** highest contamination risk. Only safe after Phase 3's namespace separation is proven.

### Phase 5 — App explainers as a tool — 2 hours
- `appHelpTool.js` + register in `graph.js`
- 10–30 canned entries
- **No Pinecone. No RAG. No DB.**

### Phase 6 — Emotion regulation tools expansion — 1-2 days
- Needs its own scope conversation (what tools? `suggest_emotion_exercise` exists — what's missing? Mood logging? Body-scan? CBT thought record?)
- Do after the above so you know how much time you have

### Phase 7 — Full system re-eval — 1 day
Run the same eval against the current system. Does it beat the pre-strategies baseline? If yes, that's your defense table.

---

## Time budget

| Phase | Estimate |
|---|---|
| 0 — Blockers + RAG fixes + re-eval | 1 day |
| 1 — Feedback capture | 1 day |
| 2 — Prompt Evolution | 1–2 days |
| 3 — Exemplar Bank | 2–3 days |
| 4 — RAG Expansion | 1–2 days |
| 5 — App explainers | 2 hrs |
| 6 — Emotion tools | 1–2 days (scope-dependent) |
| 7 — Re-eval | 1 day |
| **Total** | **~8–10 working days** |

Aggressive but achievable if you don't context-switch.

---

## Two things to send me right now (before starting Phase 0)

Just to close out the blockers:

1. **`python app.py` startup output** — first 20 lines, does it start and register `/embed`?
2. **Login status** — did clearing site data + fresh login work?

If both are green, we start Phase 0 today: apply the two `graph.js` block edits + replace `knowledgeTool.js`, re-run eval.

If either is red, we fix it before touching the strategies — building on a broken system just makes the debugging harder later.
*/