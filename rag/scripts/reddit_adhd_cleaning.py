"""
reddit_adhd_cleaning.py

Stage 1: Deterministic cleaning and inspection for the Reddit ADHD dataset.

This script:
1. Loads the raw Reddit ADHD CSV.
2. Inspects the dataset.
3. Analyzes missing/empty values.
4. Detects deleted content.
5. Detects duplicate IDs and duplicate rows.
6. Removes exact duplicate rows / duplicate IDs safely.
7. Cleans Reddit HTML/Markdown artifacts.
8. Fixes common text-encoding artifacts.
9. Normalizes whitespace.
10. Preserves title and selftext separately.
11. Creates a combined `content` field.
12. Saves cleaned CSV and Parquet.
13. Saves an analysis report and cleaning statistics.

IMPORTANT:
- Empty selftext is NOT treated as a reason to delete a post.
- Posts with a useful title but empty selftext are retained.
- Semantic problem/strategy extraction is NOT performed here.
- The raw dataset is never modified.

Recommended workflow:
1. Put this script in your project.
2. Set RAW_FILE below.
3. Run it first with TEST_ROWS = 500.
4. Inspect the generated sample.
5. Set TEST_ROWS = None and run the full dataset.
"""

from pathlib import Path
import html
import re
import unicodedata

import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

# ============================================================
# PROJECT PATHS
# ============================================================

# Project root = fyp26/
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Raw Reddit dataset
RAW_FILE = PROJECT_ROOT / "rag" / "raw" / "reddit_adhd.csv"

# All generated files
OUTPUT_DIR = PROJECT_ROOT / "rag" / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# First run: use 500 to inspect the result.
# After approving the output, change to None for all rows.
TEST_ROWS = 500

# Internal CSV reading chunk size for the full dataset.
CHUNK_SIZE = 10_000

# Output files
CLEANED_CSV = OUTPUT_DIR / "reddit_adhd_cleaned.csv"
CLEANED_PARQUET = OUTPUT_DIR / "reddit_adhd_cleaned.parquet"
ANALYSIS_REPORT = OUTPUT_DIR / "reddit_adhd_analysis.csv"
CLEANING_REPORT = OUTPUT_DIR / "reddit_adhd_cleaning_report.csv"


# ============================================================
# EXPECTED SOURCE COLUMNS
# ============================================================

EXPECTED_COLUMNS = [
    "title",
    "selftext",
    "score",
    "id",
    "url",
    "num_comments",
    "created_utc",
    "created_datetime",
]


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_reddit_text(value):
    """
    Clean a Reddit title/selftext while preserving its meaning.

    Important:
    - [deleted] and [removed] are treated as unavailable text.
    - They are converted to an empty string.
    - The row itself is NOT deleted.
    """

    if pd.isna(value):
        return ""

    text = str(value).strip()

    if not text:
        return ""

    # --------------------------------------------------------
    # Reddit unavailable-content markers
    # --------------------------------------------------------
    # These mean the original text is unavailable.
    # We represent that as empty text rather than literal
    # "[deleted]" / "[removed]".
    # --------------------------------------------------------
    if text.lower() in {
        "[deleted]",
        "[removed]",
    }:
        return ""

    # --------------------------------------------------------
    # HTML entity decoding
    # --------------------------------------------------------
    text = html.unescape(text)

    # --------------------------------------------------------
    # Markdown links
    # [visible text](https://example.com)
    # -> visible text
    # --------------------------------------------------------
    text = re.sub(
        r"\[([^\]]+)\]\((?:https?://|www\.)[^)]+\)",
        r"\1",
        text,
        flags=re.IGNORECASE,
    )

    # Reddit-style escaped Markdown brackets
    text = text.replace(r"\[", "[").replace(r"\]", "]")

    # --------------------------------------------------------
    # Remove raw URLs
    # --------------------------------------------------------
    text = re.sub(
        r"https?://\S+|www\.\S+",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------------
    # HTML line-break tags
    # --------------------------------------------------------
    text = re.sub(
        r"<\s*br\s*/?\s*>",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    text = re.sub(
        r"<\s*/?\s*p\s*>",
        " ",
        text,
        flags=re.IGNORECASE,
    )

    # Remove remaining HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # --------------------------------------------------------
    # Common Reddit Markdown formatting
    # --------------------------------------------------------
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"__(.*?)__", r"\1", text)
    text = re.sub(r"(?<!\*)\*(.*?)\*(?!\*)", r"\1", text)
    text = re.sub(r"(?<!_)_(.*?)_(?!_)", r"\1", text)

    # Markdown headings
    text = re.sub(
        r"(?m)^\s{0,3}#{1,6}\s+",
        "",
        text,
    )

    # Markdown blockquotes
    text = re.sub(
        r"(?m)^\s*>\s?",
        "",
        text,
    )

    # Markdown bullet points
    text = re.sub(
        r"(?m)^\s*[-*+]\s+",
        "",
        text,
    )

    # Ordered lists
    text = re.sub(
        r"(?m)^\s*\d+\.\s+",
        "",
        text,
    )

    # Reddit escaped Markdown characters
    text = re.sub(
        r"\\([\\`*_{}\[\]()#+.!|>~-])",
        r"\1",
        text,
    )

    # --------------------------------------------------------
    # Common mojibake / encoding artifacts
    # --------------------------------------------------------
    suspicious_markers = (
        "â€™",
        "â€œ",
        "â€",
        "â€“",
        "â€”",
        "â€¦",
        "Ã©",
        "Ã¨",
        "Ã¡",
        "Ã³",
        "Â",
    )

    if any(marker in text for marker in suspicious_markers):
        try:
            repaired = text.encode("latin1").decode("utf-8")
            text = repaired
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

    # --------------------------------------------------------
    # Unicode normalization
    # --------------------------------------------------------
    text = unicodedata.normalize("NFKC", text)

    # Normalize non-breaking spaces
    text = text.replace("\xa0", " ")

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    text = text.strip()

    # --------------------------------------------------------
    # Handle markers that may have appeared after cleaning
    # --------------------------------------------------------
    if text.lower() in {
        "[deleted]",
        "[removed]",
    }:
        return ""

    return text


# ============================================================
# EMPTY / DELETED HELPERS
# ============================================================

def is_empty(series):
    return (
        series.isna()
        | series.astype(str).str.strip().eq("")
    )


def is_deleted(series):
    return (
        series.fillna("")
        .astype(str)
        .str.strip()
        .str.lower()
        .eq("[deleted]")
    )


# ============================================================
# INSPECTION
# ============================================================

def inspect_dataframe(df):
    """Return inspection statistics without deleting anything."""

    title_empty = is_empty(df["title"])
    selftext_empty = is_empty(df["selftext"])

    title_deleted = is_deleted(df["title"])
    selftext_deleted = is_deleted(df["selftext"])

    duplicate_ids = df["id"].duplicated(keep=False)
    duplicate_rows = df.duplicated(keep=False)

    report = [
        ("total_rows", len(df)),
        ("total_columns", len(df.columns)),
        ("empty_titles", int(title_empty.sum())),
        ("empty_selftexts", int(selftext_empty.sum())),
        ("deleted_titles", int(title_deleted.sum())),
        ("deleted_selftexts", int(selftext_deleted.sum())),
        (
            "no_title_and_no_selftext",
            int((title_empty & selftext_empty).sum()),
        ),
        (
            "title_present_selftext_empty",
            int((~title_empty & selftext_empty).sum()),
        ),
        (
            "title_empty_selftext_present",
            int((title_empty & ~selftext_empty).sum()),
        ),
        ("duplicate_ids", int(df["id"].duplicated().sum())),
        ("rows_in_duplicate_id_groups", int(duplicate_ids.sum())),
        ("duplicate_complete_rows", int(df.duplicated().sum())),
        ("rows_in_duplicate_complete_row_groups", int(duplicate_rows.sum())),
        (
            "zero_comment_posts",
            int((pd.to_numeric(df["num_comments"], errors="coerce") == 0).sum()),
        ),
        (
            "negative_score_posts",
            int((pd.to_numeric(df["score"], errors="coerce") < 0).sum()),
        ),
    ]

    return pd.DataFrame(
        report,
        columns=["metric", "count"],
    )


# ============================================================
# CLEAN ONE DATAFRAME
# ============================================================

def clean_dataframe(df):
    """
    Apply deterministic cleaning.

    Returns:
        cleaned dataframe
        statistics dictionary
    """

    original_rows = len(df)

    # --------------------------------------------------------
    # Ensure expected text columns exist
    # --------------------------------------------------------
    df["title"] = df["title"].fillna("").astype(str)
    df["selftext"] = df["selftext"].fillna("").astype(str)

    # --------------------------------------------------------
    # Normalize IDs
    # --------------------------------------------------------
    df["id"] = df["id"].fillna("").astype(str).str.strip()

    # --------------------------------------------------------
    # Remove exact duplicate rows
    # --------------------------------------------------------
    exact_duplicates_removed = int(df.duplicated().sum())

    df = df.drop_duplicates(
        keep="first"
    ).copy()

    # --------------------------------------------------------
    # Remove duplicate IDs.
    #
    # We retain the first occurrence because the Reddit post ID
    # should uniquely identify a post.
    # --------------------------------------------------------
    duplicate_ids_removed = int(
        df["id"].duplicated().sum()
    )

    df = df.drop_duplicates(
        subset=["id"],
        keep="first",
    ).copy()

    # --------------------------------------------------------
    # Clean title and selftext
    # --------------------------------------------------------
    df["title"] = df["title"].apply(clean_reddit_text)
    df["selftext"] = df["selftext"].apply(clean_reddit_text)

    # --------------------------------------------------------
    # --------------------------------------------------------
    # Remove only posts with NO usable textual content.
    #
    # Empty selftext alone is NOT a reason for deletion.
    # A useful title is enough to retain the post.
    #
    # [deleted] / [removed] have already been converted to "".
    # --------------------------------------------------------
    title_empty = is_empty(df["title"])
    selftext_empty = is_empty(df["selftext"])

    no_usable_text = title_empty & selftext_empty

    unusable_rows_removed = int(no_usable_text.sum())

    df = df.loc[~no_usable_text].copy()

    unusable_rows_removed = int(no_usable_text.sum())

    df = df.loc[~no_usable_text].copy()

    # --------------------------------------------------------
    # Create combined content.
    #
    # Title remains separate as well.
    # --------------------------------------------------------
    df["content"] = (
        df["title"].str.strip()
        + "\n\n"
        + df["selftext"].str.strip()
    ).str.strip()

    # --------------------------------------------------------
    # Source metadata
    # --------------------------------------------------------
    df["source"] = "r/ADHD_posts"
    df["source_dataset"] = "reddit_adhd"
    df["subreddit"] = "r/ADHD"

    # --------------------------------------------------------
    # Reorder columns
    # --------------------------------------------------------
    preferred_columns = [
        "id",
        "title",
        "selftext",
        "content",
        "score",
        "num_comments",
        "url",
        "created_utc",
        "created_datetime",
        "source",
        "source_dataset",
        "subreddit",
    ]

    remaining_columns = [
        col
        for col in df.columns
        if col not in preferred_columns
    ]

    df = df[
        preferred_columns + remaining_columns
    ]

    statistics = {
        "input_rows": original_rows,
        "exact_duplicate_rows_removed": exact_duplicates_removed,
        "duplicate_id_rows_removed": duplicate_ids_removed,
        "unusable_no_text_rows_removed": unusable_rows_removed,
        "output_rows": len(df),
    }

    return df, statistics


# ============================================================
# MAIN
# ============================================================

def main():

    if not RAW_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found:\n{RAW_FILE.resolve()}\n\n"
            "Update RAW_FILE at the top of the script."
        )

    print("=" * 70)
    print("REDDIT ADHD DATASET - STAGE 1 CLEANING")
    print("=" * 70)

    # --------------------------------------------------------
    # TEST MODE
    # --------------------------------------------------------
    if TEST_ROWS is not None:

        print(
            f"\nTEST MODE: processing first {TEST_ROWS:,} rows."
        )

        df = pd.read_csv(
            RAW_FILE,
            nrows=TEST_ROWS,
            low_memory=False,
        )

        inspection = inspect_dataframe(df)

        print("\n--- BEFORE CLEANING ---")
        print(inspection.to_string(index=False))

        cleaned_df, stats = clean_dataframe(df)

        print("\n--- CLEANING RESULTS ---")

        for key, value in stats.items():
            print(f"{key}: {value:,}")

        # Save test outputs
        test_csv = OUTPUT_DIR / "reddit_adhd_cleaned_TEST.csv"
        test_parquet = OUTPUT_DIR / "reddit_adhd_cleaned_TEST.parquet"

        cleaned_df.to_csv(
            test_csv,
            index=False,
            encoding="utf-8",
        )

        cleaned_df.to_parquet(
            test_parquet,
            index=False,
        )

        inspection.to_csv(
            OUTPUT_DIR / "reddit_adhd_analysis_TEST.csv",
            index=False,
        )

        pd.DataFrame(
            [stats]
        ).to_csv(
            OUTPUT_DIR / "reddit_adhd_cleaning_report_TEST.csv",
            index=False,
        )

        print("\n--- TEST OUTPUT ---")
        print(f"CSV:     {test_csv.resolve()}")
        print(f"Parquet: {test_parquet.resolve()}")

        print("\nFirst cleaned records:")
        print(
            cleaned_df[
                [
                    "id",
                    "title",
                    "selftext",
                    "content",
                    "score",
                    "num_comments",
                ]
            ].head(10).to_string(index=False)
        )

        print(
            "\nTEST COMPLETE."
            "\nInspect the generated files before running the full dataset."
        )

        return

    # --------------------------------------------------------
    # FULL DATASET MODE
    # --------------------------------------------------------

    print("\nFULL DATASET MODE")
    print(f"Input: {RAW_FILE.resolve()}")

    # Remove old output files if they exist.
    for path in [
        CLEANED_CSV,
        CLEANED_PARQUET,
        ANALYSIS_REPORT,
        CLEANING_REPORT,
    ]:
        if path.exists():
            path.unlink()

    total_input = 0
    total_output = 0
    total_exact_duplicates = 0
    total_duplicate_ids = 0
    total_unusable = 0

    first_output = True

    # --------------------------------------------------------
    # Process in chunks
    # --------------------------------------------------------
    for chunk_number, chunk in enumerate(
        pd.read_csv(
            RAW_FILE,
            chunksize=CHUNK_SIZE,
            low_memory=False,
        ),
        start=1,
    ):

        print(
            f"\nProcessing chunk {chunk_number}..."
        )

        total_input += len(chunk)

        cleaned_chunk, stats = clean_dataframe(chunk)

        total_output += len(cleaned_chunk)
        total_exact_duplicates += (
            stats["exact_duplicate_rows_removed"]
        )
        total_duplicate_ids += (
            stats["duplicate_id_rows_removed"]
        )
        total_unusable += (
            stats["unusable_no_text_rows_removed"]
        )

        # ----------------------------------------------------
        # Append cleaned chunk to CSV
        # ----------------------------------------------------
        cleaned_chunk.to_csv(
            CLEANED_CSV,
            mode="w" if first_output else "a",
            header=first_output,
            index=False,
            encoding="utf-8",
        )

        first_output = False

        print(
            f"Input: {stats['input_rows']:,} | "
            f"Output: {stats['output_rows']:,}"
        )

    # --------------------------------------------------------
    # Load cleaned CSV once to create Parquet.
    #
    # 336K rows should generally be manageable on a normal PC.
    # --------------------------------------------------------
    print("\nCreating Parquet output...")

    final_df = pd.read_csv(
        CLEANED_CSV,
        low_memory=False,
    )

    final_df.to_parquet(
        CLEANED_PARQUET,
        index=False,
    )

    # --------------------------------------------------------
    # Final reports
    # --------------------------------------------------------
    cleaning_report = pd.DataFrame([
        {
            "input_rows": total_input,
            "exact_duplicate_rows_removed": total_exact_duplicates,
            "duplicate_id_rows_removed": total_duplicate_ids,
            "unusable_no_text_rows_removed": total_unusable,
            "output_rows": total_output,
        }
    ])

    cleaning_report.to_csv(
        CLEANING_REPORT,
        index=False,
    )

    final_inspection = inspect_dataframe(
        final_df
    )

    final_inspection.to_csv(
        ANALYSIS_REPORT,
        index=False,
    )

    # --------------------------------------------------------
    # Final summary
    # --------------------------------------------------------
    print("\n" + "=" * 70)
    print("FULL CLEANING COMPLETE")
    print("=" * 70)

    print(f"Input rows:                    {total_input:,}")
    print(
        f"Exact duplicate rows removed: {total_exact_duplicates:,}"
    )
    print(
        f"Duplicate ID rows removed:    {total_duplicate_ids:,}"
    )
    print(
        f"No-text rows removed:         {total_unusable:,}"
    )
    print(f"Final rows:                    {total_output:,}")

    print("\nFiles:")
    print(f"CSV:      {CLEANED_CSV.resolve()}")
    print(f"Parquet:  {CLEANED_PARQUET.resolve()}")
    print(f"Analysis: {ANALYSIS_REPORT.resolve()}")
    print(f"Report:   {CLEANING_REPORT.resolve()}")


if __name__ == "__main__":
    main()
