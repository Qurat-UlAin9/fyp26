# EF Dataset — Cleaning & Scoring-Mapping Audit Report
Generated 2026-08-29

## 0. How this file was read
No network access or `pyreadstat` was available in this environment, so `ef_raw.sav`
was parsed with a purpose-built pure-Python SPSS reader (`sav_reader.py`), implementing
the SPSS system-file format directly (header, variable/dictionary records, bytecode
decompression, `$FL2` layout). It was validated by confirming variable count (42),
case count (1,373), and the known composite score ranges all matched exactly.

## 1. Correction to prior notes: item count is 32, not 35
Earlier project notes stated the dataset has **35 EF items**. Direct inspection of
`ef_raw.sav` shows this is incorrect: the file contains **32 EF items**, not 35.

- Total columns: 42
- Demographic columns: `NACIONAL`, `GENERO`, `EDAD` (3)
- EF item columns: 32
- Composite/dimension columns: 7
- 3 + 32 + 7 = 42 ✓ (accounts for every column; no items are hidden or mis-parsed)

The 32 EF items present:
```
EF1, EF2, EF3, EF4, EF5, EF6, EF7, EF8, EF9, EF10, EF11, EF13, EF15, EF17, EF18,
EF19, EF20, EF21, EF22, EF23, EF24, EF26, EF27, EF31, EF33, EF34, EF37, EF38,
EF39, EF40, EF41, EF42
```
This matches the published source's own diagnostic note that only 32 of the
original ~41 published items survive in this particular export (9 published
items — EF12, EF14, EF16, EF25, EF28, EF29, EF30, EF32, EF35 — are absent).

Please update any downstream references (RAG notes, scoring-engine requirements,
frontend copy) that say "35 EF items" to **32**.

## 2. Data quality (cleaning validation)
| Check | Result |
|---|---|
| Rows | 1,373 |
| Columns | 42 |
| Missing EF values | 0 |
| EF values outside 1–5 | 0 |
| Exact duplicate rows | 56 rows forming 28 duplicate pairs |

**Status: PASS** on structure, missing values, and range validity.

### Duplicate rows — pattern found
The 28 duplicate pairs are **not randomly scattered**. Their row-index offsets
cluster tightly: 12 pairs are exactly 19 rows apart, 6 pairs are 17 rows apart,
3 pairs are 22 apart, 3 pairs are 7 apart, plus a couple of adjacent pairs. The
duplicated rows also occur in contiguous *blocks* (e.g. rows 240–251 reappear
verbatim at rows 259–270).

This pattern — identical contiguous blocks reappearing at a near-constant offset
— is the signature of a **copy/append error during data export or entry**, not
28 independent respondents who coincidentally gave identical answers across
39 columns. **Recommendation:** treat the second occurrence in each pair as a
duplicate export artifact and exclude it from analysis, but keep it flagged
(not silently deleted) so this can be double-checked against the original data
collection source if available.

The cleaned CSV includes two audit columns for this rather than deleting rows:
- `duplicate_group_id` (-1 if not part of any duplicate group)
- `is_duplicate_secondary` (True for the row(s) recommended for exclusion)

## 3. Scoring-formula recovery — method
For each of the 7 composite columns, item membership was recovered by:
1. Ordinary least squares of the composite against all 32 EF items (full rank = 32,
   so the regression is well-determined).
2. Every composite showed a small set of items with regression weight ≈ 1.0 and every
   other item at weight ≈ 0, with a sharp, unambiguous gap between the two groups —
   strong evidence for exact 0/1 (unweighted-sum) membership of that item group.
3. Each candidate item set was then checked for an **exact** match (sum of items ==
   composite value, for all 1,373 rows, not just on average).
4. Where an exact match was not found, an exhaustive brute-force search (all subsets
   of size 3–6 or 3–9, depending on the composite, drawn from *all 32 items*, not just
   the top-weighted ones) was run to rule out any other combination of available items
   reproducing the composite exactly.
5. Reverse-scoring (item transformed as `6 - item`) was tested as well, alone and in
   combination with direct items — no reverse-scored formula reproduced any composite
   either.

## 4. Results

| Dimension | Status | Items | Residual (composite − item-sum) |
|---|---|---|---|
| **Organizacionelemnetostareas** | ✅ **EXACT** | EF1, EF6, EF7, EF37 | 0 for all 1,373 rows |
| SistemaAtencionalSupervisor | ⚠ Partial | EF10, EF15, EF17, EF19, EF27, EF39 | 4–10 |
| RegulacionDeliberadaEmocion | ⚠ Partial | EF4, EF34, EF40, EF42 | 1–5 |
| MonitorizacionConscieteResponsabilidades | ⚠ Partial | EF2, EF8, EF9, EF18, EF38 | 4–10 |
| Verificaciondelaconducta | ⚠ Partial | EF24, EF31, EF33, EF41 | 2–5 |
| Controlinhibitorio | ⚠ Partial | EF3, EF11, EF20, EF21, EF22, EF23 | 3–10 |
| tomadedecisiones | ⚠ Partial | EF5, EF13, EF26 | 2–10 |

**Only `Organizacionelemnetostareas` is exactly reconstructable from this dataset.**

### Why the other six can't be closed exactly
For all six partial dimensions, the residual (what's left after subtracting the
confirmed item sum from the true composite):
- Is always **strictly positive** (the true composite is always *larger* than the
  confirmed items sum to — never smaller), consistent with one or more additional
  positively-scored items being missing from the calculation, not an error in the
  confirmed items.
- Has a range consistent with exactly 1–2 missing Likert items (e.g.
  RegulacionDeliberadaEmocion's residual is *exactly* 1–5, the full theoretical
  range of a single item; tomadedecisiones's residual is *exactly* 2–10, the full
  theoretical range of two items).
- Correlates only weakly (≤0.28) with every one of the 32 available items — the level
  of correlation you'd expect from an unrelated missing variable via the general EF
  factor, not from a coding relationship with something already in the sheet.
- Cannot be matched (confirmed via exhaustive brute-force search) by any subset of
  3–9 of the 32 available items, direct or reverse-scored.

Cross-referencing this against the published source's item-to-factor table
independently supports the same conclusion: several of the published factors this
dataset maps to originally included 1–2 items that are among the 9 items missing
from this export (e.g. the published "attention" factor includes EF30 and EF35,
both absent here; "supervision" includes EF25 and EF29, both absent).

**Conclusion: these six composites were computed upstream (likely in SPSS, from the
original ~41-item instrument) using items that are not present in this 32-item
export. They cannot be exactly recomputed from `ef_raw.sav` alone.** Closing this
gap would require either the original wider dataset (with all ~41 items) or
accepting the six-dimension scores as approximations that run consistently a few
points below the historical values.

## 5. What the scoring engine does with this
`ef_scoring_engine.py` implements all 7 dimensions using the item sets above, and:
- Labels `Organizacionelemnetostareas` as `status: exact`.
- Labels the other six as `status: partial`, each carrying an explanatory note.
- Computes raw score, mean score, and a normalized 0–100 score per dimension
  (0–100 is scaled against that dimension's own theoretical min/max using only the
  confirmed items — it does *not* try to project what the "true" historical scale
  would have shown).
- Does **not** compute an overall EF composite — no validated formula for one exists
  yet, consistent with the project's scoring-engine requirement to only compute an
  overall score once such a formula is established.
- Never returns or implies any diagnostic label.

## 6. Recommended next steps
1. **If exact scores for all 7 dimensions are required for production**, locate the
   original, wider EF dataset export (with all ~41 published items) rather than
   trying to close the gap statistically from this file.
2. **If the current partial formulas are acceptable**, they can go to production as-is,
   clearly surfaced to users/analysts as approximate for six of seven dimensions.
3. Decide on duplicate handling: recommend excluding the 28 flagged secondary rows
   from any statistical modeling (e.g. norm calculation), while keeping them in the
   raw/cleaned export for traceability.
4. Once dimension scores are finalized, revisit whether an overall EF composite
   formula should be defined (e.g. weighted sum of the 7 dimension normalized scores)
   — no such formula currently exists in the source data.
