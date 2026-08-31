from pathlib import Path
import pandas as pd

# Optional dependency for .sav:
# pip install pyreadstat

try:
    import pyreadstat
except ImportError:
    pyreadstat = None


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

XLSX_FILE = BASE_DIR / "backend" / "data" / "executive_function" / "ef_raw.xlsx"
SAV_FILE = BASE_DIR / "backend" / "data" / "executive_function" / "ef_raw.sav"

OUTPUT_DIR = BASE_DIR / "backend" / "data" / "executive_function" / "inspection"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# GENERAL DATAFRAME INSPECTION
# ============================================================

def inspect_dataframe(df, name):

    print("\n" + "=" * 80)
    print(f"{name}")
    print("=" * 80)

    print(f"Rows:    {len(df):,}")
    print(f"Columns: {len(df.columns):,}")

    print("\n--- COLUMN NAMES ---")

    for i, col in enumerate(df.columns, start=1):
        print(f"{i:03d}. {col}")

    print("\n--- DATA TYPES ---")
    print(df.dtypes.to_string())

    print("\n--- MISSING VALUES ---")

    missing = df.isna().sum()

    missing_report = pd.DataFrame({
        "column": missing.index,
        "missing_count": missing.values,
        "missing_percent": (
            missing.values / len(df) * 100
        ).round(2)
    })

    print(
        missing_report[
            missing_report["missing_count"] > 0
        ].to_string(index=False)
    )

    print("\n--- UNIQUE VALUES ---")

    unique_report = []

    for col in df.columns:

        unique_count = df[col].nunique(dropna=False)

        unique_report.append({
            "column": col,
            "unique_values": unique_count
        })

    unique_report = pd.DataFrame(unique_report)

    print(unique_report.to_string(index=False))

    print("\n--- FIRST 10 ROWS ---")
    print(df.head(10).to_string())

    return missing_report, unique_report


# ============================================================
# VALUE FREQUENCIES
# ============================================================

def inspect_value_frequencies(df, output_name):

    print("\n" + "=" * 80)
    print("VALUE FREQUENCIES")
    print("=" * 80)

    all_results = []

    for col in df.columns:

        counts = df[col].value_counts(
            dropna=False
        ).sort_index()

        print(f"\n--- {col} ---")
        print(counts.to_string())

        for value, count in counts.items():

            all_results.append({
                "column": col,
                "value": value,
                "count": count,
                "percentage": round(
                    count / len(df) * 100,
                    2
                )
            })

    frequency_df = pd.DataFrame(all_results)

    frequency_df.to_csv(
        OUTPUT_DIR / output_name,
        index=False,
        encoding="utf-8"
    )

    return frequency_df


# ============================================================
# NUMERIC DESCRIPTIVE STATISTICS
# ============================================================

def inspect_numeric(df, output_name):

    numeric_df = df.select_dtypes(
        include="number"
    )

    print("\n" + "=" * 80)
    print("NUMERIC DESCRIPTIVE STATISTICS")
    print("=" * 80)

    if numeric_df.empty:
        print("No numeric columns found.")
        return

    stats = numeric_df.describe().T

    stats["missing"] = numeric_df.isna().sum()

    print(stats.to_string())

    stats.to_csv(
        OUTPUT_DIR / output_name,
        encoding="utf-8"
    )


# ============================================================
# SPSS METADATA
# ============================================================

def inspect_sav():

    if pyreadstat is None:

        print(
            "\npyreadstat is not installed."
            "\nInstall it with:"
            "\npip install pyreadstat"
        )

        return None

    if not SAV_FILE.exists():

        print(
            f"\nSAV file not found:\n{SAV_FILE}"
        )

        return None

    print("\n" + "=" * 80)
    print("READING SPSS .SAV")
    print("=" * 80)

    df, meta = pyreadstat.read_sav(
        SAV_FILE
    )

    print(f"Rows:    {len(df):,}")
    print(f"Columns: {len(df.columns):,}")

    # --------------------------------------------------------
    # Variable labels
    # --------------------------------------------------------

    print("\n--- VARIABLE LABELS ---")

    variable_labels = []

    for column in df.columns:

        label = meta.column_names_to_labels.get(
            column,
            ""
        )

        print(
            f"{column}: {label}"
        )

        variable_labels.append({
            "column": column,
            "label": label
        })

    pd.DataFrame(
        variable_labels
    ).to_csv(
        OUTPUT_DIR / "sav_variable_labels.csv",
        index=False,
        encoding="utf-8"
    )

    # --------------------------------------------------------
    # Value labels
    # --------------------------------------------------------

    print("\n--- VALUE LABELS ---")

    value_label_rows = []

    for column, mapping in meta.variable_value_labels.items():

        print(f"\n{column}")

        for value, label in mapping.items():

            print(
                f"  {value} -> {label}"
            )

            value_label_rows.append({
                "column": column,
                "value": value,
                "label": label
            })

    pd.DataFrame(
        value_label_rows
    ).to_csv(
        OUTPUT_DIR / "sav_value_labels.csv",
        index=False,
        encoding="utf-8"
    )

    # --------------------------------------------------------
    # Missing values
    # --------------------------------------------------------

    print("\n--- SPSS MISSING VALUE DEFINITIONS ---")

    missing_rows = []

    for column in df.columns:

        missing_info = meta.missing_ranges.get(
            column
        )

        if missing_info is not None:

            print(
                f"{column}: {missing_info}"
            )

            missing_rows.append({
                "column": column,
                "missing_definition": str(
                    missing_info
                )
            })

    pd.DataFrame(
        missing_rows
    ).to_csv(
        OUTPUT_DIR / "sav_missing_values.csv",
        index=False,
        encoding="utf-8"
    )

    # --------------------------------------------------------
    # General inspection
    # --------------------------------------------------------

    inspect_dataframe(
        df,
        "SPSS DATASET"
    )

    inspect_value_frequencies(
        df,
        "sav_value_frequencies.csv"
    )

    inspect_numeric(
        df,
        "sav_numeric_statistics.csv"
    )

    # --------------------------------------------------------
    # Save a CSV copy for inspection only
    # --------------------------------------------------------

    df.to_csv(
        OUTPUT_DIR / "sav_data_preview.csv",
        index=False,
        encoding="utf-8"
    )

    return df, meta


# ============================================================
# XLSX INSPECTION
# ============================================================

def inspect_xlsx():

    if not XLSX_FILE.exists():

        print(
            f"\nXLSX file not found:\n{XLSX_FILE}"
        )

        return None

    print("\n" + "=" * 80)
    print("READING EXCEL .XLSX")
    print("=" * 80)

    # Read all sheets
    sheets = pd.read_excel(
        XLSX_FILE,
        sheet_name=None
    )

    print(
        f"\nNumber of sheets: {len(sheets)}"
    )

    for sheet_name, df in sheets.items():

        print("\n" + "-" * 80)
        print(f"SHEET: {sheet_name}")
        print("-" * 80)

        print(
            f"Rows: {len(df):,}"
        )

        print(
            f"Columns: {len(df.columns):,}"
        )

        # Safe filename
        safe_name = (
            str(sheet_name)
            .replace(" ", "_")
            .replace("/", "_")
            .replace("\\", "_")
        )

        inspect_dataframe(
            df,
            f"XLSX SHEET: {sheet_name}"
        )

        inspect_value_frequencies(
            df,
            f"xlsx_{safe_name}_value_frequencies.csv"
        )

        inspect_numeric(
            df,
            f"xlsx_{safe_name}_numeric_statistics.csv"
        )

        # Save exact read copy for comparison
        df.to_csv(
            OUTPUT_DIR /
            f"xlsx_{safe_name}_preview.csv",
            index=False,
            encoding="utf-8"
        )

    return sheets


# ============================================================
# COMPARE SAV AND XLSX
# ============================================================

def compare_sav_xlsx(sav_df, sheets):

    if sav_df is None or sheets is None:
        return

    if len(sheets) == 0:
        return

    # Usually the first sheet contains the dataset.
    xlsx_df = list(sheets.values())[0]

    print("\n" + "=" * 80)
    print("SAV vs XLSX COMPARISON")
    print("=" * 80)

    print(
        f"SAV rows:    {len(sav_df):,}"
    )

    print(
        f"XLSX rows:   {len(xlsx_df):,}"
    )

    print(
        f"SAV columns:  {len(sav_df.columns):,}"
    )

    print(
        f"XLSX columns: {len(xlsx_df.columns):,}"
    )

    sav_columns = set(
        map(str, sav_df.columns)
    )

    xlsx_columns = set(
        map(str, xlsx_df.columns)
    )

    print("\nColumns only in SAV:")

    for col in sorted(
        sav_columns - xlsx_columns
    ):
        print(" ", col)

    print("\nColumns only in XLSX:")

    for col in sorted(
        xlsx_columns - sav_columns
    ):
        print(" ", col)

    common_columns = sorted(
        sav_columns & xlsx_columns
    )

    print(
        f"\nCommon columns: {len(common_columns)}"
    )

    # --------------------------------------------------------
    # Compare common columns
    # --------------------------------------------------------

    comparison_rows = []

    for col in common_columns:

        sav_values = (
            sav_df[col]
            .astype(str)
            .reset_index(drop=True)
        )

        xlsx_values = (
            xlsx_df[col]
            .astype(str)
            .reset_index(drop=True)
        )

        comparable_rows = min(
            len(sav_values),
            len(xlsx_values)
        )

        differences = (
            sav_values.iloc[:comparable_rows]
            != xlsx_values.iloc[:comparable_rows]
        ).sum()

        comparison_rows.append({
            "column": col,
            "sav_rows_compared": comparable_rows,
            "different_values": int(
                differences
            )
        })

    comparison_df = pd.DataFrame(
        comparison_rows
    )

    print("\n--- COLUMN VALUE COMPARISON ---")

    print(
        comparison_df.to_string(
            index=False
        )
    )

    comparison_df.to_csv(
        OUTPUT_DIR /
        "sav_xlsx_comparison.csv",
        index=False,
        encoding="utf-8"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 80)
    print("EXECUTIVE FUNCTION DATASET INSPECTION")
    print("=" * 80)

    sav_result = inspect_sav()

    if sav_result is not None:
        sav_df, sav_meta = sav_result
    else:
        sav_df = None

    xlsx_sheets = inspect_xlsx()

    compare_sav_xlsx(
        sav_df,
        xlsx_sheets
    )

    print("\n" + "=" * 80)
    print("INSPECTION COMPLETE")
    print("=" * 80)

    print(
        f"\nReports saved to:\n{OUTPUT_DIR.resolve()}"
    )


if __name__ == "__main__":
    main()